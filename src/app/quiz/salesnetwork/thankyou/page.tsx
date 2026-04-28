"use client";

export default function SalesNetworkThankYou() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0A1628", color: "#FFFFFF" }}
    >
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full text-center">
          {/* Header */}
          <h1
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            THE SALES NETWORK
          </h1>
          <div
            className="w-24 h-px mx-auto mb-12"
            style={{ backgroundColor: "#C9933A" }}
          />

          {/* Thank you message */}
          <h2 className="text-3xl font-bold mb-6">
            Thank you for sharing your story.
          </h2>
          <div
            className="text-base leading-relaxed mb-10 text-left"
            style={{ color: "#9CA3AF" }}
          >
            <p className="mb-4">
              We review all submissions and will be in touch within 3 days if
              your feature is selected for publication. We will tag you on
              LinkedIn when it goes live.
            </p>
            <p>
              If you said yes to the podcast recording, Akanbi will be in touch
              shortly with a calendar link.
            </p>
          </div>

          {/* CTA */}
          <div className="mb-8">
            <p className="text-sm mb-4" style={{ color: "#9CA3AF" }}>
              While you wait — see what AI sales practice looks like.
            </p>
            <a
              href="https://practiceinteractions.com/practice?scenerio=c73f452a-b6ee-4e7b-be7a-1fdda50bf4e4"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-4 rounded-lg font-semibold text-lg transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "#C9933A",
                color: "#0A1628",
              }}
            >
              Try a Free Scenario
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm" style={{ color: "#9CA3AF" }}>
        The Sales Network &middot;{" "}
        <a
          href="https://practiceinteractions.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#C9933A" }}
        >
          practiceinteractions.com
        </a>
      </footer>
    </div>
  );
}
