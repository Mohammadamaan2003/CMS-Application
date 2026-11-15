const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const contactErrors = await executeMcpSql(`
      SELECT DISTINCT error_msg FROM CRM.CONTACT_UPLOAD_STG WHERE error_msg IS NOT NULL
    `);
    const ruleSet = new Set();
    contactErrors.forEach(row => {
      const msg = row.ERROR_MSG || row.error_msg || '';
      msg.split('|').forEach(part => {
        let trimmed = part.trim();
        if (/Company ID \d+ does not exist/.test(trimmed)) {
          trimmed = 'Company ID <id> does not exist';
        }
        if (/Company Name "[^"]+" not found/.test(trimmed)) {
          trimmed = 'Company Name <name> not found';
        }
        if (/LinkedIn Connected Account "[^"]+" not found/.test(trimmed)) {
          trimmed = 'LinkedIn Connected Account <acc> not found';
        }
        if (/ID "[^"]+" is not a valid number/.test(trimmed)) {
          trimmed = 'ID <id> is not a valid number';
        }
        if (trimmed) ruleSet.add(trimmed);
      });
    });
    console.log('Error Rules in Apex:', Array.from(ruleSet));

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

