// Download PDF via fetch with proper headers
const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://www.sanbenitocountyca.gov/home/showpublisheddocument/13572/638733278379100000';
const outputPath = path.join(__dirname, '..', 'data', 'san-benito-protocols', 'SBC_Manual_2025_Full.pdf');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/pdf,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.sanbenitocountyca.gov/departments/office-of-emergency-services-oes-and-emergency-medical-services/emergency-medical-services-ems/policy-and-procedure-manual'
  }
};

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, options, (response) => {
    console.log('Status:', response.statusCode);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.headers['content-length']);
    
    if (response.statusCode === 302 || response.statusCode === 301) {
      console.log('Redirect to:', response.headers.location);
      download(response.headers.location, dest, cb);
      return;
    }
    
    response.pipe(file);
    file.on('finish', () => {
      file.close(cb);
      const stats = fs.statSync(dest);
      console.log('Downloaded:', stats.size, 'bytes');
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error('Error:', err.message);
  });
}

download(url, outputPath, () => console.log('Done!'));
