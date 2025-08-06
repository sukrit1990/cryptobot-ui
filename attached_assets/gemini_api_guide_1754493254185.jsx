import React from "react";

const GeminiGuide = () => {
  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <header className="bg-indigo-900 text-white text-center py-6 rounded-2xl shadow-md mb-8">
        <h1 className="text-3xl font-bold">Gemini User Guide</h1>
        <p className="text-lg mt-2">How to Create an Account and Generate a Primary API Key</p>
      </header>

      <main className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        {/* Section 1: Account Creation */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-indigo-900 mb-4">1. Create a Gemini Account</h2>
          <ol className="list-decimal list-inside space-y-4">
            <li>
              Go to <a href="https://www.gemini.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://www.gemini.com</a>
            </li>
            <li>
              Click on the <strong>“Get Started”</strong> button.
              <img src="/images/placeholder-get-started.png" alt="Screenshot of Gemini homepage with 'Get Started' highlighted" className="mt-2 rounded" />
            </li>
            <li>
              Fill in your details and click <strong>“Create Account.”</strong>
              <img src="/images/placeholder-signup-form.png" alt="Gemini sign-up form screenshot" className="mt-2 rounded" />
            </li>
            <li>Verify your email and complete 2FA setup.</li>
          </ol>
        </section>

        {/* Section 2: API Key Generation */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-indigo-900 mb-4">2. Generate a Primary API Key</h2>
          <ol className="list-decimal list-inside space-y-4">
            <li>Log in and go to <strong>Account → Settings → API</strong>.</li>
            <li>
              Click <strong>“Create New API Key.”</strong>
              <img src="/images/placeholder-create-api-key.png" alt="Create new API key button on Gemini" className="mt-2 rounded" />
            </li>
            <li>
              Select the key type as <strong>Primary</strong>.
              <img src="/images/placeholder-create-primary-key.png" alt="Select primary key type screenshot" className="mt-2 rounded" />
            </li>
            <li>
              Name your key and set permissions:
              <ul className="list-disc list-inside ml-6">
                <li><strong>Trading</strong> - ✅ Enabled</li>
                <li><strong>Fund Management</strong> - ✅ Enabled</li>
              </ul>
              <img src="/images/placeholder-api-key-permissions.png" alt="API key permissions selection screenshot" className="mt-2 rounded" />
            </li>
            <li>
              (Optional) Restrict access by IP address for added security.
              <img src="/images/placeholder-api-ip-permissions.png" alt="API IP permissions configuration screenshot" className="mt-2 rounded" />
            </li>
            <li>Confirm using 2FA.</li>
          </ol>

          <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 mt-4 rounded">
            <strong>Note:</strong> Never share your API secret. Only enable permissions required by your app.
          </div>
        </section>

        {/* Conclusion */}
        <section>
          <h2 className="text-2xl font-semibold text-indigo-900 mb-4">3. You're All Set!</h2>
          <p className="mb-2">Your Gemini account is now ready, and your API Key has been configured for trading and fund management.</p>
          <p>Use the credentials securely.</p>
        </section>
      </main>
    </div>
  );
};

export default GeminiGuide;
