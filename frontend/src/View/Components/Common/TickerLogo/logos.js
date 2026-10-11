import apple from '../../../Assets/Image/Icons/vuvietduc.com.png';
import meta from '../../../Assets/Image/Icons/selfhst_meta.png';
import microsoft from '../../../Assets/Image/Icons/selfhst_microsoft.png';
import google from '../../../Assets/Image/Icons/material-icon-theme_google.png';
import amazon from '../../../Assets/Image/Icons/selfhst_amazon.png';
import nvidia from '../../../Assets/Image/Icons/selfhst_nvidia.png';

// Ticker -> company logo. Tickers not listed fall back to a text badge.
const logos = {
  AAPL: apple,
  META: meta,
  MSFT: microsoft,
  GOOGL: google,
  GOOG: google,
  AMZN: amazon,
  NVDA: nvidia,
};

export default logos;
