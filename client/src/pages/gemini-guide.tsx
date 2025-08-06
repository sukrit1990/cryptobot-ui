import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import getStartedImg from "@assets/placeholder-get-started_1754493262222.png";
import signupFormImg from "@assets/placeholder-signup-form_1754493262224.png";
import createApiKeyImg from "@assets/placeholder-create-api-key_1754493262221.png";
import createPrimaryKeyImg from "@assets/placeholder-create-primary-key_1754493262221.png";
import apiKeyPermissionsImg from "@assets/placeholder-api-key-permissions_1754493262220.png";
import apiIpPermissionsImg from "@assets/placeholder-api-ip-permissions_1754493262219.png";

export default function GeminiGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2">Gemini User Guide</h1>
          <p className="text-xl text-indigo-100">How to Create an Account and Generate a Primary API Key</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-12">
          {/* Section 1: Account Creation */}
          <section>
            <h2 className="text-3xl font-semibold text-indigo-900 dark:text-indigo-300 mb-6 border-b-2 border-indigo-200 dark:border-indigo-700 pb-2">
              1. Create a Gemini Account
            </h2>
            <ol className="list-decimal list-inside space-y-6 text-gray-700 dark:text-gray-300">
              <li className="text-lg">
                Go to{" "}
                <a 
                  href="https://www.gemini.com" 
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  https://www.gemini.com
                </a>
              </li>
              
              <li className="text-lg">
                Click on the <strong className="text-indigo-700 dark:text-indigo-300">"Get Started"</strong> button.
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img 
                    src={getStartedImg} 
                    alt="Screenshot of Gemini homepage with 'Get Started' highlighted" 
                    className="w-full rounded-lg shadow-md hover:shadow-lg transition-shadow" 
                  />
                </div>
              </li>
              
              <li className="text-lg">
                Fill in your details and click <strong className="text-indigo-700 dark:text-indigo-300">"Create Account."</strong>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img 
                    src={signupFormImg} 
                    alt="Gemini sign-up form screenshot" 
                    className="w-full rounded-lg shadow-md hover:shadow-lg transition-shadow" 
                  />
                </div>
              </li>
              
              <li className="text-lg">
                <strong>Verify your email and complete 2FA setup.</strong>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-400">
                  <strong>Important:</strong> Two-factor authentication is required for API access and adds an extra layer of security to your account.
                </p>
              </li>
            </ol>
          </section>

          {/* Section 2: API Key Generation */}
          <section>
            <h2 className="text-3xl font-semibold text-indigo-900 dark:text-indigo-300 mb-6 border-b-2 border-indigo-200 dark:border-indigo-700 pb-2">
              2. Generate a Primary API Key
            </h2>
            <ol className="list-decimal list-inside space-y-6 text-gray-700 dark:text-gray-300">
              <li className="text-lg">
                Log in and go to <strong className="text-indigo-700 dark:text-indigo-300">Account → Settings → API</strong>.
              </li>
              
              <li className="text-lg">
                Click <strong className="text-indigo-700 dark:text-indigo-300">"Create New API Key."</strong>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img 
                    src={createApiKeyImg} 
                    alt="Create new API key button on Gemini" 
                    className="w-full rounded-lg shadow-md hover:shadow-lg transition-shadow" 
                  />
                </div>
              </li>
              
              <li className="text-lg">
                Select the key type as <strong className="text-indigo-700 dark:text-indigo-300">Primary</strong>.
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img 
                    src={createPrimaryKeyImg} 
                    alt="Select primary key type screenshot" 
                    className="w-full rounded-lg shadow-md hover:shadow-lg transition-shadow" 
                  />
                </div>
              </li>
              
              <li className="text-lg">
                Name your key and set permissions:
                <ul className="list-disc list-inside ml-6 mt-3 space-y-2">
                  <li><strong className="text-green-600 dark:text-green-400">Trading</strong> - ✅ Enabled</li>
                  <li><strong className="text-green-600 dark:text-green-400">Fund Management</strong> - ✅ Enabled</li>
                </ul>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img 
                    src={apiKeyPermissionsImg} 
                    alt="API key permissions selection screenshot" 
                    className="w-full rounded-lg shadow-md hover:shadow-lg transition-shadow" 
                  />
                </div>
              </li>
              
              <li className="text-lg">
                (Optional) Restrict access by IP address for added security.
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img 
                    src={apiIpPermissionsImg} 
                    alt="API IP permissions configuration screenshot" 
                    className="w-full rounded-lg shadow-md hover:shadow-lg transition-shadow" 
                  />
                </div>
              </li>
              
              <li className="text-lg">
                <strong>Confirm using 2FA.</strong>
              </li>
            </ol>

            {/* Security Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 mt-6 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Security Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p><strong>Never share your API secret.</strong> Only enable permissions required by your app. Store your API credentials securely and never commit them to version control.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-8 rounded-xl border border-green-200 dark:border-green-700">
            <h2 className="text-3xl font-semibold text-indigo-900 dark:text-indigo-300 mb-4">
              3. You're All Set!
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              Your Gemini account is now ready, and your API Key has been configured for trading and fund management.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Use the credentials securely in your CryptoInvest Pro application.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/settings">
                <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                  Return to Settings
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}