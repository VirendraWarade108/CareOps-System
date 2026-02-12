from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
import uvicorn

from app.database import get_db, Base, engine
from app.config import settings
from app import models, schemas
from app.utils.security import verify_password, get_password_hash, create_access_token, decode_access_token

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CareOps API",
    description="Unified Operations Platform for Service Businesses",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# ============== DEPENDENCIES ==============
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """Get current authenticated user"""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

async def get_current_workspace(
    workspace_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.Workspace:
    """Get workspace and verify user has access"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Check if user is owner or member
    if workspace.owner_id != current_user.id:
        is_member = db.query(models.WorkspaceMember).filter(
            models.WorkspaceMember.workspace_id == workspace_id,
            models.WorkspaceMember.user_id == current_user.id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return workspace


# ============== AUTHENTICATION ROUTES ==============
@app.post("/api/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    # Check if user exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user"""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


# ============== WORKSPACE ROUTES ==============
@app.post("/api/workspaces", response_model=schemas.WorkspaceResponse)
def create_workspace(
    workspace: schemas.WorkspaceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new workspace"""
    import re
    
    # Generate slug from business name
    slug = re.sub(r'[^a-z0-9]+', '-', workspace.business_name.lower()).strip('-')
    
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(models.Workspace).filter(models.Workspace.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    db_workspace = models.Workspace(
        **workspace.dict(),
        slug=slug,
        owner_id=current_user.id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    return db_workspace

@app.get("/api/workspaces", response_model=List[schemas.WorkspaceResponse])
def get_workspaces(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's workspaces"""
    # Get owned workspaces
    owned = db.query(models.Workspace).filter(
        models.Workspace.owner_id == current_user.id
    ).all()
    
    # Get member workspaces
    memberships = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.user_id == current_user.id
    ).all()
    
    member_workspaces = [m.workspace for m in memberships]
    
    return owned + member_workspaces

@app.get("/api/workspaces/{workspace_id}", response_model=schemas.WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workspace details"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return workspace


# ============== CONTACT ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/contacts", response_model=schemas.ContactResponse)
def create_contact(
    workspace_id: str,
    contact: schemas.ContactCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new contact"""
    db_contact = models.Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    
    return db_contact

@app.get("/api/workspaces/{workspace_id}/contacts", response_model=List[schemas.ContactResponse])
def get_contacts(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get all contacts for workspace"""
    contacts = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace_id
    ).all()
    
    return contacts


# ============== BOOKING ROUTES ==============
@app.post("/api/workspaces/{workspace_id}/bookings", response_model=schemas.BookingResponse)
def create_booking(
    workspace_id: str,
    booking: schemas.BookingCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Create new booking"""
    from datetime import timedelta
    
    # Get or create contact
    contact = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace_id,
        models.Contact.email == booking.contact_email
    ).first()
    
    if not contact:
        contact = models.Contact(
            workspace_id=workspace_id,
            name=booking.contact_name,
            email=booking.contact_email,
            phone=booking.contact_phone,
            source="booking"
        )
        db.add(contact)
        db.flush()
    
    # Get service type for duration
    service = db.query(models.ServiceType).filter(
        models.ServiceType.id == booking.service_type_id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service type not found")
    
    # Calculate end time
    end_time = booking.scheduled_at + timedelta(minutes=service.duration_minutes)
    
    db_booking = models.Booking(
        workspace_id=workspace_id,
        contact_id=contact.id,
        service_type_id=booking.service_type_id,
        scheduled_at=booking.scheduled_at,
        end_time=end_time,
        notes=booking.notes,
        location=service.location,
        status="pending"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # TODO: Send confirmation email
    # TODO: Send intake form
    
    return db_booking

@app.get("/api/workspaces/{workspace_id}/bookings", response_model=List[schemas.BookingResponse])
def get_bookings(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get all bookings for workspace"""
    bookings = db.query(models.Booking).filter(
        models.Booking.workspace_id == workspace_id
    ).order_by(models.Booking.scheduled_at.desc()).all()
    
    return bookings


# ============== DASHBOARD ROUTES ==============
@app.get("/api/workspaces/{workspace_id}/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    workspace_id: str,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    from datetime import datetime, timedelta
    
    today = datetime.now().date()
    
    # Count today's bookings
    today_bookings = db.query(models.Booking).filter(
        models.Booking.workspace_id == workspace_id,
        models.Booking.scheduled_at >= today,
        models.Booking.scheduled_at < today + timedelta(days=1)
    ).count()
    
    # Count upcoming bookings
    upcoming_bookings = db.query(models.Booking).filter(
        models.Booking.workspace_id == workspace_id,
        models.Booking.scheduled_at >= datetime.now(),
        models.Booking.status == "pending"
    ).count()
    
    # Count new leads (contacts created in last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    new_leads = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace_id,
        models.Contact.created_at >= week_ago
    ).count()
    
    # Count pending forms
    pending_forms = db.query(models.FormSubmission).join(
        models.Booking
    ).filter(
        models.Booking.workspace_id == workspace_id,
        models.FormSubmission.status == "pending"
    ).count()
    
    # Count low stock items
    low_stock_items = db.query(models.InventoryItem).filter(
        models.InventoryItem.workspace_id == workspace_id,
        models.InventoryItem.quantity <= models.InventoryItem.low_stock_threshold
    ).count()
    
    # Count unread alerts
    unread_alerts = db.query(models.Alert).filter(
        models.Alert.workspace_id == workspace_id,
        models.Alert.is_read == False
    ).count()
    
    return {
        "total_bookings_today": today_bookings,
        "upcoming_bookings": upcoming_bookings,
        "new_leads": new_leads,
        "pending_forms": pending_forms,
        "low_stock_items": low_stock_items,
        "unread_alerts": unread_alerts
    }


# ============== PUBLIC ROUTES (No Auth) ==============
@app.get("/api/public/workspaces/{slug}")
def get_public_workspace(slug: str, db: Session = Depends(get_db)):
    """Get public workspace info"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return {
        "business_name": workspace.business_name,
        "address": workspace.address,
        "timezone": workspace.timezone
    }

@app.get("/api/public/workspaces/{slug}/services")
def get_public_services(slug: str, db: Session = Depends(get_db)):
    """Get public service types"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    services = db.query(models.ServiceType).filter(
        models.ServiceType.workspace_id == workspace.id,
        models.ServiceType.is_active == True
    ).all()
    
    return services

@app.post("/api/public/workspaces/{slug}/bookings")
def create_public_booking(
    slug: str,
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db)
):
    """Create booking from public booking page"""
    workspace = db.query(models.Workspace).filter(
        models.Workspace.slug == slug,
        models.Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Get or create contact
    contact = db.query(models.Contact).filter(
        models.Contact.workspace_id == workspace.id,
        models.Contact.email == booking.contact_email
    ).first()
    
    if not contact:
        contact = models.Contact(
            workspace_id=workspace.id,
            name=booking.contact_name,
            email=booking.contact_email,
            phone=booking.contact_phone,
            source="booking"
        )
        db.add(contact)
        db.flush()
    
    # Get service
    service = db.query(models.ServiceType).filter(
        models.ServiceType.id == booking.service_type_id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    from datetime import timedelta
    end_time = booking.scheduled_at + timedelta(minutes=service.duration_minutes)
    
    # Create booking
    db_booking = models.Booking(
        workspace_id=workspace.id,
        contact_id=contact.id,
        service_type_id=service.id,
        scheduled_at=booking.scheduled_at,
        end_time=end_time,
        notes=booking.notes,
        location=service.location,
        status="pending"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # TODO: Send confirmation email and forms
    
    return {"message": "Booking created successfully", "booking_id": str(db_booking.id)}


# ============== HEALTH CHECK ==============
@app.get("/")
def root():
    return {"message": "CareOps API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
