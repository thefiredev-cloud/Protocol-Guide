// Get Railway build logs
const deployId = 'd8f0caa4-e64d-49de-9431-0fd7dbfa3667';
const token = 'f2c35129-680b-4891-9400-cf157fff04cd';

async function getLogs() {
  const response = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `query { buildLogs(deploymentId: "${deployId}", limit: 100) { message severity timestamp } }`
    })
  });
  
  const data = await response.json();
  if (data.errors) {
    console.log('Errors:', JSON.stringify(data.errors, null, 2));
  } else if (data.data && data.data.buildLogs) {
    data.data.buildLogs.forEach(log => {
      console.log(`[${log.severity}] ${log.message}`);
    });
  } else {
    console.log('No logs found. Full response:', JSON.stringify(data, null, 2));
  }
}

getLogs().catch(console.error);
