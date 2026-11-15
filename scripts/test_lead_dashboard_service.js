const leadDashboardService = require('../server/services/leadDashboardService');

async function testService() {
  try {
    console.log('Testing getLeadFilterOptions...');
    const opts = await leadDashboardService.getLeadFilterOptions();
    console.log('Filter options counts: companies:', opts.companies.length, 'techs:', opts.technologies.length, 'countries:', opts.countries.length);

    console.log('Testing getLeadOverview...');
    const overview = await leadDashboardService.getLeadOverview({});
    console.log('Overview KPIs:', overview.kpis);
    console.log('Overview Charts:', Object.keys(overview.charts));

    console.log('Testing getLeadSalesPerformance...');
    const sales = await leadDashboardService.getLeadSalesPerformance({});
    console.log('Sales managers count:', sales.totalLeadsByAccountManager.length, 'team rows:', sales.salesTeamPerformance.length);

    console.log('Testing getLeadTechnology...');
    const tech = await leadDashboardService.getLeadTechnology({});
    console.log('Tech bar count:', tech.technologyByTotalLeads.length, 'Country-tech rows:', tech.countriesByTechnology.length);

    console.log('Testing getLeadDetailsReport...');
    const details = await leadDashboardService.getLeadDetailsReport({}, { page: 1, pageSize: 5 });
    console.log('Lead details total:', details.total, 'returned:', details.data.length);

    console.log('Testing getLeadLinesReport...');
    const lines = await leadDashboardService.getLeadLinesReport({}, { page: 1, pageSize: 5 });
    console.log('Lead lines total:', lines.total, 'returned:', lines.data.length);

    console.log('Testing getLeadProposalsReport...');
    const proposals = await leadDashboardService.getLeadProposalsReport({}, { page: 1, pageSize: 5 });
    console.log('Lead proposals total:', proposals.total, 'returned:', proposals.data.length);

    console.log('Testing getLeadResourcesReport...');
    const resources = await leadDashboardService.getLeadResourcesReport({}, { page: 1, pageSize: 5 });
    console.log('Lead resources total:', resources.total, 'returned:', resources.data.length);

    console.log('\nALL LEAD DASHBOARD SERVICE TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Service test error:', err);
    process.exit(1);
  }
}

testService();
