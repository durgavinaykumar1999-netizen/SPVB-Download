import AdUnit from './AdUnit';

const header728 = (
  <AdUnit
    key="hr-728"
    atOptions={`{
      'key' : 'e00807f9355f6f59d09b4cb9632b1930',
      'format' : 'iframe',
      'height' : 90,
      'width' : 728,
      'params' : {}
    }`}
    srcs={['https://www.highrevenueformat.com/e00807f9355f6f59d09b4cb9632b1930/invoke.js']}
    className="ad-slot ad-banner"
  />
);

const header468 = (
  <AdUnit
    key="hr-468"
    atOptions={`{
      'key' : 'c51f0a9e64d78d55f75a4ccd8eedc96c',
      'format' : 'iframe',
      'height' : 60,
      'width' : 468,
      'params' : {}
    }`}
    srcs={['https://www.highrevenueformat.com/c51f0a9e64d78d55f75a4ccd8eedc96c/invoke.js']}
    className="ad-slot ad-banner"
  />
);

const inline300 = (
  <AdUnit
    key="hr-300"
    atOptions={`{
      'key' : 'a37057b57277f779aa7eb6c39d0ca6d0',
      'format' : 'iframe',
      'height' : 250,
      'width' : 300,
      'params' : {}
    }`}
    srcs={['https://www.highrevenueformat.com/a37057b57277f779aa7eb6c39d0ca6d0/invoke.js']}
    className="ad-slot ad-rect"
  />
);

const sidebar160 = (
  <AdUnit
    key="hr-160"
    atOptions={`{
      'key' : '8266d43ddb40fa7f697b88ce1986a7c1',
      'format' : 'iframe',
      'height' : 300,
      'width' : 160,
      'params' : {}
    }`}
    srcs={['https://www.highrevenueformat.com/8266d43ddb40fa7f697b88ce1986a7c1/invoke.js']}
    className="ad-slot ad-skyscraper"
  />
);

const sidebar600 = (
  <AdUnit
    key="hr-600"
    atOptions={`{
      'key' : '569093e60d83db368a64b41564e536e7',
      'format' : 'iframe',
      'height' : 600,
      'width' : 160,
      'params' : {}
    }`}
    srcs={['https://www.highrevenueformat.com/569093e60d83db368a64b41564e536e7/invoke.js']}
    className="ad-slot ad-skyscraper"
  />
);

const mobile50 = (
  <AdUnit
    key="hr-320"
    atOptions={`{
      'key' : '1029ff22b684cfa96772119d5a4a7e73',
      'format' : 'iframe',
      'height' : 50,
      'width' : 320,
      'params' : {}
    }`}
    srcs={['https://www.highrevenueformat.com/1029ff22b684cfa96772119d5a4a7e73/invoke.js']}
    className="ad-slot ad-mobile"
  />
);

const prn1 = (
  <AdUnit
    key="prn-1"
    srcs={['https://pl31124194.profitableratecpmnetwork.com/95/d8/cf/95d8cf0051e91631d54da7bc56ecbca1.js']}
    className="ad-slot ad-banner"
  />
);

const prn2 = (
  <AdUnit
    key="prn-2"
    containerId="container-0221bc3a4d9d8690c9c87b8d892de725"
    srcs={[
      'https://pl31124195.profitableratecpmnetwork.com/0221bc3a4d9d8690c9c87b8d892de725/invoke.js',
    ]}
    className="ad-slot ad-rect"
  />
);

const prn3 = (
  <AdUnit
    key="prn-3"
    srcs={['https://pl31124197.profitableratecpmnetwork.com/ed/81/a6/ed81a612a8e2f2946bf640986f3a2b90.js']}
    className="ad-slot ad-skyscraper"
  />
);

export const AdHeader = () => (
  <div className="ads-row ads-top">
    {header728}
    {header468}
    {prn1}
  </div>
);

export const AdSidebar = () => (
  <div className="ads-sidebar">
    {sidebar160}
    {sidebar600}
    {prn3}
  </div>
);

export const AdInline = () => (
  <div className="ads-row ads-inline">
    {inline300}
    {prn2}
  </div>
);

export const AdMobile = () => (
  <div className="ads-mobile">{mobile50}</div>
);
