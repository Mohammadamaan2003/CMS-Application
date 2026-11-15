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
        const trimmed = part.trim();
        // Normalize specific values like "Name "X" not found" -> "Name <val> not found"
        const norm = trimmed.replace(/"[^"]+"/g, '<val>');
        if (norm) ruleSet.add(norm);
      });
    });
    console.log('Distinct Error Rules in Apex:', Array.from(ruleSet).sort());

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

