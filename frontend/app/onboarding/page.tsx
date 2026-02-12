'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [services, setServices] = useState<any[]>([]);

  // Step 1: Workspace data
  const [workspace, setWorkspace] = useState({
    business_name: '',
    address: '',
    city: '',
    state: '',
    timezone: 'America/New_York',
    contact_email: '',
    contact_phone: ''
  });

  // Step 2: Email Integration
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: ''
  });

  // Step 3: Contact Form
  const [contactForm, setContactForm] = useState({
    name: 'Contact Form',
    fields: [
      { type: 'text', label: 'Name', name: 'name', required: true },
      { type: 'email', label: 'Email', name: 'email', required: true },
      { type: 'phone', label: 'Phone', name: 'phone', required: false },
      { type: 'textarea', label: 'Message', name: 'message', required: false }
    ]
  });

  // Step 4: Service Types
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    location: '',
    color: '#3B82F6'
  });

  // Step 5: Availability (per service)
  const [availability, setAvailability] = useState<any[]>([]);

  // Step 6: Post-Booking Forms
  const [postBookingForms, setPostBookingForms] = useState<any[]>([]);

  // Step 7: Inventory
  const [inventory, setInventory] = useState<any[]>([]);
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    quantity: 0,
    low_stock_threshold: 10,
    unit: 'pieces',
    vendor_email: ''
  });

  const nextStep = () => setCurrentStep(Math.min(8, currentStep + 1));
  const prevStep = () => setCurrentStep(Math.max(1, currentStep - 1));

  // Step 1: Create Workspace
  const handleStep1 = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/workspaces', workspace);
      setWorkspaceId(response.data.id);
      await api.patch(`/api/workspaces/${response.data.id}/onboarding-step`, { step: 2 });
      nextStep();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.detail || 'Failed to create workspace'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Email Integration
  const handleStep2 = async () => {
    setIsLoading(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/integrations`, {
        type: 'email',
        provider: 'smtp',
        config: emailConfig
      });
      await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 3 });
      nextStep();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.detail || 'Failed to setup email'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Contact Form
  const handleStep3 = async () => {
    setIsLoading(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/contact-forms`, contactForm);
      await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 4 });
      nextStep();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.detail || 'Failed to create contact form'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Add Service
  const addService = async () => {
    if (!newService.name) return;
    setIsLoading(true);
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/services`, {
        ...newService,
        workspace_id: workspaceId
      });
      setServices([...services, response.data]);
      setNewService({
        name: '',
        description: '',
        duration_minutes: 60,
        location: '',
        color: '#3B82F6'
      });
    } catch (error: any) {
      alert('Error adding service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4 = async () => {
    if (services.length === 0) {
      alert('Please add at least one service');
      return;
    }
    await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 5 });
    nextStep();
  };

  // Step 5: Skip for now (availability setup)
  const handleStep5 = async () => {
    await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 6 });
    nextStep();
  };

  // Step 6: Skip for now (post-booking forms)
  const handleStep6 = async () => {
    await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 7 });
    nextStep();
  };

  // Step 7: Inventory (optional)
  const addInventoryItem = async () => {
    if (!newInventoryItem.name) return;
    setIsLoading(true);
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/inventory`, {
        ...newInventoryItem,
        workspace_id: workspaceId
      });
      setInventory([...inventory, response.data]);
      setNewInventoryItem({
        name: '',
        quantity: 0,
        low_stock_threshold: 10,
        unit: 'pieces',
        vendor_email: ''
      });
    } catch (error: any) {
      alert('Error adding inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep7 = async () => {
    await api.patch(`/api/workspaces/${workspaceId}/onboarding-step`, { step: 8 });
    nextStep();
  };

  // Step 8: Activate
  const handleActivate = async () => {
    setIsLoading(true);
    try {
      await api.patch(`/api/workspaces/${workspaceId}/activate`);
      router.push('/dashboard');
    } catch (error: any) {
      alert('Error activating workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of 8
            </span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 8) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Step 1: Workspace */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Create Your Workspace</h2>
              <p className="text-gray-600 mb-6">Let's start with the basics about your business</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={workspace.business_name}
                    onChange={(e) => setWorkspace({ ...workspace, business_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Acme Healthcare"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={workspace.city}
                      onChange={(e) => setWorkspace({ ...workspace, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={workspace.state}
                      onChange={(e) => setWorkspace({ ...workspace, state: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={workspace.contact_email}
                    onChange={(e) => setWorkspace({ ...workspace, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="contact@acme.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Timezone</label>
                  <select
                    value={workspace.timezone}
                    onChange={(e) => setWorkspace({ ...workspace, timezone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleStep1}
                disabled={isLoading || !workspace.business_name}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Email Integration */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Email Integration</h2>
              <p className="text-gray-600 mb-6">Connect your email to send confirmations and reminders</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={emailConfig.smtp_host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={emailConfig.smtp_user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">App Password</label>
                  <input
                    type="password"
                    value={emailConfig.smtp_password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="••••••••••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For Gmail, use an App Password (not your regular password)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact Form */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Contact Form</h2>
              <p className="text-gray-600 mb-6">Default contact form is ready. You can customize it later.</p>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {contactForm.fields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{field.label}</span>
                    <span className="text-gray-500">({field.type})</span>
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleStep3}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Services */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Service Types</h2>
              <p className="text-gray-600 mb-6">What services do you offer?</p>

              <div className="space-y-4 mb-6">
                {services.map((service, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.duration_minutes} minutes</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-6 space-y-3">
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Service name (e.g., Consultation)"
                />
                <input
                  type="number"
                  value={newService.duration_minutes}
                  onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Duration (minutes)"
                />
                <button
                  onClick={addService}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Add Service
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleStep4}
                  disabled={services.length === 0}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Availability */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Availability</h2>
              <p className="text-gray-600 mb-6">Set your working hours (you can customize this later)</p>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm">
                  Default availability will be set to Monday-Friday, 9 AM - 5 PM. You can customize this in settings.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleStep5}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Post-Booking Forms */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Post-Booking Forms</h2>
              <p className="text-gray-600 mb-6">Collect information after appointments (optional)</p>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm">
                  You can create intake forms and questionnaires later from your dashboard.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleStep6}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 7: Inventory */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Inventory (Optional)</h2>
              <p className="text-gray-600 mb-6">Track supplies and get low-stock alerts</p>

              <div className="space-y-4 mb-6">
                {inventory.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity} {item.unit}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-6 space-y-3">
                <input
                  type="text"
                  value={newInventoryItem.name}
                  onChange={(e) => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Item name (e.g., Gloves)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={newInventoryItem.quantity}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Quantity"
                  />
                  <input
                    type="text"
                    value={newInventoryItem.unit}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, unit: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Unit (pieces, boxes)"
                  />
                </div>
                <button
                  onClick={addInventoryItem}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Add Item
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleStep7}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 8: Review & Activate */}
          {currentStep === 8 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">🎉 You're All Set!</h2>
              <p className="text-gray-600 mb-6">Review your setup and activate your workspace</p>

              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Completed Steps:</h3>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>✓ Workspace created</li>
                    <li>✓ Email integration configured</li>
                    <li>✓ Contact form ready</li>
                    <li>✓ {services.length} service(s) added</li>
                    <li>✓ Availability set to default hours</li>
                    <li>✓ {inventory.length} inventory item(s) added</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Your public booking page will be available at:<br />
                    <strong className="font-mono">yoursite.com/book/{workspace.business_name.toLowerCase().replace(/\s+/g, '-')}</strong>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Activating...' : 'Activate Workspace 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}