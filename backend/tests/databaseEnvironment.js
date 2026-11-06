const applicationRef = 'aaaaaaaaaaaaaaaaaaaa';
const testRef = 'bbbbbbbbbbbbbbbbbbbb';
const poolerHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const sessionUrl = (ref, extra = '') => `postgresql://postgres.${ref}:synthetic-unit-password@${poolerHost}:5432/postgres${extra}`;
const directUrl = ref => `postgresql://postgres:synthetic-unit-password@db.${ref}.supabase.co:5432/postgres`;
const testEnvironment = () => ({ NODE_ENV: 'test', DATABASE_URL: sessionUrl(applicationRef), SUPABASE_PROJECT_REF: applicationRef,
  TEST_DATABASE_URL: sessionUrl(testRef), TEST_SUPABASE_PROJECT_REF: testRef });

module.exports = { applicationRef, testRef, poolerHost, sessionUrl, directUrl, testEnvironment };
