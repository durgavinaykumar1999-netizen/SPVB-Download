import React, { useState } from 'react';
import './ScrollingNotice.css';

interface ScrollingNoticeProps {
  onAccept?: () => void;
}

const ScrollingNotice: React.FC<ScrollingNoticeProps> = ({ onAccept }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      {/* Scrolling Notice Banner */}
      <div className="scrolling-notice-banner">
        <div className="notice-content">
          <span className="notice-icon">⚠️</span>
          <div className="notice-text-scroll">
            <p>
              <strong>IMPORTANT NOTICE:</strong> This platform is designed for downloading publicly available videos only.
              We only support videos that are freely available for public use. Users are solely responsible for ensuring
              they have the legal right to download and use all content. We do not support downloading copyrighted material
              without proper authorization. By using this service, you agree to comply with all applicable laws and respect
              intellectual property rights. Unauthorized downloading of copyrighted content may result in legal consequences.
            </p>
          </div>
          <button
            className="notice-details-btn"
            onClick={() => setShowDetails(!showDetails)}
            title="View full terms"
          >
            {showDetails ? '✕' : 'ⓘ'}
          </button>
        </div>
      </div>

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="notice-details-modal">
          <div className="modal-overlay" onClick={() => setShowDetails(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h2>📋 SPVB Downloader - Comprehensive Terms & Disclaimer</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>✕</button>
            </div>

            <div className="modal-body">
              <section className="terms-section">
                <h3>1. Service Description & Legal Compliance</h3>
                <p>
                  SPVB Downloader is a media processing platform designed exclusively for downloading and managing
                  publicly available videos from supported platforms. This service is provided "as-is" and is intended
                  for personal, non-commercial use only. Users must comply with:
                </p>
                <ul>
                  <li>All applicable local, state, and international laws and regulations</li>
                  <li>Terms of Service of all supported platforms (Instagram, Facebook, TikTok, X/Twitter)</li>
                  <li>Copyright, trademark, and intellectual property laws</li>
                  <li>Data protection and privacy regulations (GDPR, CCPA, etc.)</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>2. Content Eligibility & Copyright Protection</h3>
                <p>
                  <strong>Only Publicly Available Content:</strong> This platform exclusively supports downloading videos
                  that are freely available for public viewing. We do NOT and CANNOT support:
                </p>
                <ul>
                  <li>Copyrighted material without proper authorization or licensing</li>
                  <li>Protected videos that require purchase or subscription</li>
                  <li>Private or restricted-access content</li>
                  <li>Content owned by copyright holders who have not explicitly allowed public distribution</li>
                  <li>Licensed content from entertainment companies, studios, or copyright organizations</li>
                  <li>Age-restricted or harmful content</li>
                </ul>
                <p>
                  Users warrant that they have the legal right to download and use any content processed through this service.
                </p>
              </section>

              <section className="terms-section">
                <h3>3. User Responsibility & Liability</h3>
                <p>
                  <strong>Sole User Responsibility:</strong> The user assumes full legal responsibility for:
                </p>
                <ul>
                  <li>Verifying ownership or authorization to download any content</li>
                  <li>Understanding and respecting copyright and intellectual property rights</li>
                  <li>Ensuring compliance with all applicable laws and platform terms</li>
                  <li>Any legal consequences arising from unauthorized use or distribution of content</li>
                  <li>Obtaining necessary permissions from copyright holders before downloading</li>
                </ul>
                <p>
                  SPVB Downloader disclaims all liability for user-downloaded content and actions taken with such content.
                </p>
              </section>

              <section className="terms-section">
                <h3>4. No Support for Copyright Infringement</h3>
                <p>
                  We expressly do NOT:
                </p>
                <ul>
                  <li>Facilitate the downloading of copyrighted material in violation of intellectual property laws</li>
                  <li>Support or enable content piracy, unauthorized distribution, or copyright violation</li>
                  <li>Guarantee the legality of any downloaded content</li>
                  <li>Accept liability for misuse of our platform for infringing activities</li>
                </ul>
                <p>
                  Any attempt to use this service for copyright infringement will result in immediate termination
                  of access and potential legal action.
                </p>
              </section>

              <section className="terms-section">
                <h3>5. Platform Terms & Respect for Original Owners</h3>
                <p>
                  Users acknowledge and agree that:
                </p>
                <ul>
                  <li>Downloading videos may violate Terms of Service of original platforms</li>
                  <li>Original content creators and copyright holders retain all rights to their work</li>
                  <li>Downloaded content should be used only for personal, fair-use purposes</li>
                  <li>Commercial use of downloaded content without authorization is prohibited</li>
                  <li>We recommend respecting creator preferences regarding content distribution</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>6. Data & Privacy Policy</h3>
                <p>
                  Our data handling practices:
                </p>
                <ul>
                  <li>We collect minimal personal data necessary to provide our service</li>
                  <li>All processing data is temporary and automatically deleted</li>
                  <li>We do not store, sell, or share user information with third parties</li>
                  <li>No tracking cookies or invasive analytics are used</li>
                  <li>GDPR and international privacy laws are fully respected</li>
                  <li>Users can request data deletion at any time</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>7. No Warranty & Limitation of Liability</h3>
                <p>
                  <strong>DISCLAIMER:</strong>
                </p>
                <ul>
                  <li>Service is provided "AS-IS" without any warranties</li>
                  <li>We are not liable for content accuracy, legality, or quality</li>
                  <li>We are not liable for any damages from platform changes or service interruptions</li>
                  <li>We do not guarantee uninterrupted or error-free service</li>
                  <li>Maximum liability is limited to direct damages only</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>8. Acceptable Use Policy</h3>
                <p>
                  Prohibited activities:
                </p>
                <ul>
                  <li>Downloading copyrighted material without authorization</li>
                  <li>Redistributing downloaded content commercially</li>
                  <li>Using the service for illegal purposes</li>
                  <li>Attempting to bypass platform security or restrictions</li>
                  <li>Harassing creators or violating others' rights</li>
                  <li>Automated mass downloading (scraping)</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>9. Google AdSense Compliance</h3>
                <p>
                  This website complies with all Google AdSense policies and advertising standards:
                </p>
                <ul>
                  <li>No copyrighted content is used or promoted in advertising materials</li>
                  <li>All ads comply with Google's program policies</li>
                  <li>No misleading or prohibited content in ad placement</li>
                  <li>Full compliance with intellectual property and copyright guidelines</li>
                  <li>Transparent disclosure of data collection and user analytics</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>10. Modification & Termination</h3>
                <p>
                  We reserve the right to:
                </p>
                <ul>
                  <li>Modify terms and service features at any time with notice</li>
                  <li>Terminate access for users violating these terms</li>
                  <li>Remove support for platforms or features without liability</li>
                  <li>Enforce copyright protection and legal compliance</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>11. Legal Jurisdiction & Dispute Resolution</h3>
                <p>
                  These terms are governed by applicable international law. Any disputes will be resolved
                  through negotiation, mediation, or arbitration as appropriate.
                </p>
              </section>

              <section className="terms-section final-notice">
                <h3>⚖️ FINAL LEGAL NOTICE</h3>
                <p>
                  <strong>By using SPVB Downloader, you explicitly acknowledge and agree that:</strong>
                </p>
                <ul>
                  <li>You have read and understood all terms and disclaimers</li>
                  <li>You accept full legal responsibility for downloaded content</li>
                  <li>You will not use this service for copyright infringement or illegal purposes</li>
                  <li>You respect all intellectual property rights and creator ownership</li>
                  <li>You will comply with all applicable laws and platform terms</li>
                  <li>SPVB Downloader bears no liability for your use of this service</li>
                </ul>
                <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#ef4444' }}>
                  Violation of these terms may result in legal action and prosecution.
                </p>
              </section>

              <section className="terms-section">
                <h3>📞 Contact Information</h3>
                <p>
                  For inquiries, copyright concerns, or legal matters, please contact:
                </p>
                <p>
                  Email: <strong>legal@spvbdownloader.com</strong><br />
                  Website: <strong>https://spvbdownloadgames.dpdns.org</strong>
                </p>
              </section>
            </div>

            <div className="modal-footer">
              <button className="btn-accept" onClick={() => {
                setShowDetails(false);
                onAccept?.();
              }}>
                ✓ I Understand & Accept
              </button>
              <button className="btn-close" onClick={() => setShowDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScrollingNotice;
