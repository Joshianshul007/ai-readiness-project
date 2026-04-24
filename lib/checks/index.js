import * as structuredData from './structuredData';
import * as faq from './faq';
import * as headings from './headings';
import * as metaTags from './metaTags';
import * as openGraph from './openGraph';

export const CHECK_RUNNERS = [
  { run: structuredData.default, meta: structuredData.meta },
  { run: faq.default, meta: faq.meta },
  { run: headings.default, meta: headings.meta },
  { run: metaTags.default, meta: metaTags.meta },
  { run: openGraph.default, meta: openGraph.meta },
];
