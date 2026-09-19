import React from 'react';
import './ScrollingNotice.css';

interface ScrollingNoticeProps {
  educationMode?: boolean;
}

const ScrollingNotice: React.FC<ScrollingNoticeProps> = ({ educationMode = false }) => {
  const scrollText = educationMode
    ? "ℹ️ EDUCATIONAL NOTICE: This is an educational project for learning purposes. We access third-party hosted URLs only. No data is stored on our servers. All content is hosted by third parties. If you have copyright concerns, contact: vinaymail1820@gmail.com. We are an educational initiative and do not claim ownership of any third-party content."
    : "⚠️ LEGAL NOTICE: Download only public, freely available videos. You are responsible for ensuring you have legal rights to download content. We do not support copyrighted material. Respect intellectual property and comply with all laws. Unauthorized downloading may have legal consequences. Use this service at your own risk.";

  return (
    <div className="scrolling-notice">
      <div className="scrolling-content">
        <span>{scrollText}</span>
        <span>{scrollText}</span>
      </div>
    </div>
  );
};

export default ScrollingNotice;
