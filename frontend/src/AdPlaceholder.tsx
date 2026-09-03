// Fallback ad placeholders when ad networks don't load

export const AdPlaceholder = ({
  width,
  height,
  type = 'banner'
}: {
  width: number;
  height: number;
  type?: string;
}) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        height: `${height}px`,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: '2px solid #764ba2',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => window.open('https://www.highrevenueformat.com', '_blank')}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>📢</div>
      <div>Advertisement</div>
      <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>Click to learn more</div>
    </div>
  );
};
