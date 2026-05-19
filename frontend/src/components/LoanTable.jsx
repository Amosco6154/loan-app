import React from 'react';

const LoanTable = ({ loans, onEdit, onDelete }) => {
  if (loans.length === 0) {
    return (
      <div className="bg-white p-8 text-center text-gray-500 rounded-xl shadow-sm border border-gray-100">
        No loans found. Create a new loan to get started.
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="min-w-full text-sm text-left">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th scope="col" className="px-6 py-4 font-semibold">Borrower Name</th>
            <th scope="col" className="px-6 py-4 font-semibold">Amount</th>
            <th scope="col" className="px-6 py-4 font-semibold">Interest Rate</th>
            <th scope="col" className="px-6 py-4 font-semibold">Due Date</th>
            <th scope="col" className="px-6 py-4 font-semibold">Status</th>
            <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loans.map((loan) => (
            <tr key={loan.id} className="hover:bg-gray-50 transition-colors group">
              <td className="px-6 py-4 font-medium text-gray-900">
                {loan.borrower_name}
              </td>
              <td className="px-6 py-4 text-gray-600">
                ${loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 text-gray-600">
                {loan.interest_rate}%
              </td>
              <td className="px-6 py-4 text-gray-600">
                {new Date(loan.due_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(loan.status)} capitalize`}>
                  {loan.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-3">
                <button
                  onClick={() => onEdit(loan)}
                  className="font-medium text-indigo-600 hover:text-indigo-900 hover:underline transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(loan.id)}
                  className="font-medium text-red-600 hover:text-red-900 hover:underline transition-all"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoanTable;
