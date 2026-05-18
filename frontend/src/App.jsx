import { useState } from "react";
import "./App.css";

function App() {
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("");

  const calculateLoan = () => {
    const interest = amount * 0.1;
    const total = Number(amount) + interest;
    const monthly = total / months;

    return monthly.toFixed(2);
  };

  return (
    <div className="container">
      <h1>Loan Calculator</h1>

      <input
        type="number"
        placeholder="Loan Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="number"
        placeholder="Repayment Months"
        value={months}
        onChange={(e) => setMonths(e.target.value)}
      />

      <button>Calculate</button>

      {amount && months ? (
        <h2>Monthly Payment: ${calculateLoan()}</h2>
      ) : null}
    </div>
  );
}

export default App;