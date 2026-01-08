export default function Dashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
      <div className="bg-white p-12 rounded-2xl shadow-2xl text-center">
        <h1 className="text-5xl font-bold mb-8 text-green-800">
          Welcome to SACAA Aviation Marketplace! ✈️
        </h1>
        <p className="text-2xl mb-10 text-gray-700">
          You are successfully logged in!
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}