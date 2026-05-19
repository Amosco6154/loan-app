import React, { useState, useEffect } from 'react';

const LoanFormModal = ({ isOpen, onClose, onSubmit, initialData, borrowers }) => {
  const [formData, setFormData] = useState({
    borrower_id: '',
    amount: '',
    interest_rate: '',
    due_date: '',
    status: 'pending'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        borrower_id: initialData.borrower_id,
        amount: initialData.amount,
        interest_rate: initialData.interest_rate,
        due_date: initialData.due_date,
        status: initialData.status || 'pending'
      });
    } else {
      setFormData({
        borrower_id: '',
        amount: '',
        interest_rate: '',
        due_date: '',
        status: 'pending'
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.borrower_id || !formData.amount || !formData.interest_rate || !formData.due_date) {
      alert("All fields are required.");
      return;
    }
    
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      interest_rate: parseFloat(formData.interest_rate)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Edit Loan' : 'Issue New Loan'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Borrower</label>
            <select
              name="borrower_id" required value={formData.borrower_id} onChange={handleChange} disabled={!!initialData}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white disabled:bg-gray-100"
            >
              <option value="" disabled>Select a Borrower</option>
              {borrowers.map(b => (
                <option key={b.id} value={b.id}>{b.full_name} ({b.national_id})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
              <input
                type="number" name="amount" step="0.01" min="0" required value={formData.amount} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
              <input
                type="number" name="interest_rate" step="0.01" min="0" required value={formData.interest_rate} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date" name="due_date" required value={formData.due_date} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {initialData && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-50">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
            >
              {initialData ? 'Update Loan' : 'Issue Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanFormModal;
