import React, { useState, useEffect } from 'react';

const GENDERS = ['male', 'female', 'other'];

const Field = ({ label, children, required }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm";

const BorrowerFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const emptyForm = {
    full_name: '', phone_number: '', national_id: '', address: '',
    date_of_birth: '', gender: '', email: '', occupation: '', employer: '',
    monthly_income: '', next_of_kin_name: '', next_of_kin_phone: '',
    collateral_info: '', id_document: null
  };

  const [formData, setFormData] = useState(emptyForm);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          full_name: initialData.full_name || '',
          phone_number: initialData.phone_number || '',
          national_id: initialData.national_id || '',
          address: initialData.address || '',
          date_of_birth: initialData.date_of_birth || '',
          gender: initialData.gender || '',
          email: initialData.email || '',
          occupation: initialData.occupation || '',
          employer: initialData.employer || '',
          monthly_income: initialData.monthly_income || '',
          next_of_kin_name: initialData.next_of_kin_name || '',
          next_of_kin_phone: initialData.next_of_kin_phone || '',
          collateral_info: initialData.collateral_info || '',
          id_document: null
        });
      } else {
        setFormData(emptyForm);
        setFileName('');
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, id_document: file }));
      setFileName(file.name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone_number || !formData.national_id) {
      alert("Full name, phone number, and national ID are required.");
      return;
    }
    // Build FormData for multipart (file upload)
    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (key === 'id_document' && val) data.append('id_document', val);
      else if (val !== null && val !== '') data.append(key, val);
    });
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {initialData ? 'Edit Borrower Profile' : 'Register New Borrower'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">All fields marked * are required</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section: Personal Info */}
          <div>
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className={inputClass} placeholder="John Doe" required />
              </Field>
              <Field label="Email Address">
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="john@email.com" />
              </Field>
              <Field label="Phone Number" required>
                <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} className={inputClass} placeholder="+1 555 000 0000" required />
              </Field>
              <Field label="National ID / Passport" required>
                <input type="text" name="national_id" value={formData.national_id} onChange={handleChange} className={inputClass} placeholder="ID Number" required />
              </Field>
              <Field label="Date of Birth">
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={inputClass} />
              </Field>
              <Field label="Gender">
                <select name="gender" value={formData.gender} onChange={handleChange} className={`${inputClass} bg-white`}>
                  <option value="">Select gender</option>
                  {GENDERS.map(g => <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Residential Address">
                <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="123 Main St, City" />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section: Employment */}
          <div>
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">Employment & Income</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Occupation">
                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className={inputClass} placeholder="e.g. Teacher, Engineer" />
              </Field>
              <Field label="Employer / Company">
                <input type="text" name="employer" value={formData.employer} onChange={handleChange} className={inputClass} placeholder="Company name" />
              </Field>
              <Field label="Monthly Income ($)">
                <input type="number" name="monthly_income" min="0" step="0.01" value={formData.monthly_income} onChange={handleChange} className={inputClass} placeholder="0.00" />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section: Next of Kin */}
          <div>
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">Next of Kin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Next of Kin Name">
                <input type="text" name="next_of_kin_name" value={formData.next_of_kin_name} onChange={handleChange} className={inputClass} placeholder="Jane Doe" />
              </Field>
              <Field label="Next of Kin Phone">
                <input type="tel" name="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={handleChange} className={inputClass} placeholder="+1 555 000 0001" />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section: Collateral & Documents */}
          <div>
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">Collateral & Documentation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Collateral Information">
                <textarea name="collateral_info" value={formData.collateral_info} onChange={handleChange} className={inputClass} placeholder="e.g. Land title, vehicle logbook, etc." rows={3} />
              </Field>
              <Field label="ID Document / Photo (JPG, PNG, PDF)">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-xs text-gray-500">{fileName || 'Click to upload document'}</span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                </label>
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              {initialData ? 'Update Borrower' : 'Register Borrower'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BorrowerFormModal;
