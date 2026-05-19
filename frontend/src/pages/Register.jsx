export default function Register() {
  return (
    <div className="flex justify-center items-center h-screen">
      <form className="bg-white p-8 rounded shadow w-96">
        <h2 className="text-3xl mb-5">Register</h2>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full border p-3 mb-4"
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 mb-4"
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 mb-4"
        />

        <button className="w-full bg-black text-white p-3 rounded">
          Register
        </button>
      </form>
    </div>
  );
}