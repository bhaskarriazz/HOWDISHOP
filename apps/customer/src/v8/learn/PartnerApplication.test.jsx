import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import PartnerApplication from './PartnerApplication';

test('application review preserves user text and URLs while escaping markup', () => {
  const html = renderToStaticMarkup(<PartnerApplication role="startup"
    fields={[["startup_name", "Startup name"], ["website", "Website"], ["about", "About"]]}
    values={{ startup_name: 'Craft_Studio', website: 'https://example.test/our_team', about: '<script>not executable</script>' }}
    application={{status:'submitted'}} status={['warn', 'With HOWDI for review']} editable={false}
    declaration={true} formatDate={() => 'Today'} />);
  assert.ok(html.includes('Craft_Studio'));
  assert.ok(html.includes('https://example.test/our_team'));
  assert.ok(html.includes('&lt;script&gt;not executable&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('Submit for review'));
});
