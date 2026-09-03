// Simple ad placeholder - clean and minimal

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
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#999';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#ddd';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => window.open('https://www.highrevenueformat.com', '_blank')}
    />
  );
};
