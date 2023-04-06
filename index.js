require('dotenv').config();
const fs = require('fs');
const path = require('path');

const spawn = require('child_process').spawn;

const Influxdb = require('influxdb-v2');

const PythonStringRegex = /\d+\.\d+\.\d+/;

const log_path = path.join(__dirname, 'logs');

let last_date = 0;

// Check if the WakaTime API key is set
if(!process.env.WAKATOKEN) {
  console.log("Please set the WAKATOKEN environment variable to your WakaTime API key.");
  process.exit(1);
}

// Check if the InfluxDB credentials are set
if(!process.env.ORGA && !process.env.BUCKET && !process.env.USER && !process.env.HOST && !process.env.PROTOCOL && !process.env.PORT && !process.env.TOKEN) {
  console.log("Please set the ORGA, BUCKET, USER, HOST, PROTOCOL, PORT and TOKEN environment variables to your InfluxDB credentials.");
  process.exit(1);
}

const db = new Influxdb({
  host: process.env.HOST,
  protocol: process.env.PROTOCOL,
  port: process.env.PORT,
  token: process.env.TOKEN
});

// Check if the log directory exists
if (!fs.existsSync(log_path)) {
  fs.mkdirSync(log_path);
}

// Check if wakatime-stats.json exists
const stats_path = path.join(log_path, 'wakatime-stats.json');

if (!fs.existsSync(stats_path)) {
  fs.writeFileSync(stats_path, `{"${process.env.BEGIN || "2020-1-1"}": {"languages": {},"machines": {},"operating_systems": {},"projects": {}}}`);
}

if (fs.existsSync(path.join(log_path, 'last_date.txt'))) {
  last_date = fs.readFileSync(path.join(log_path, 'last_date.txt'), 'utf-8');
}

/**
 * Run a cli command within node as async function in a specific directory
 * @param {String} command | The command to execute
 * @param {String} cwd | Path to execute the command in
 * @param {Boolean} log | Log the output to the console, if false the output will be returned
 * @returns 
 */
function executeCommand(command, cwd, log = false) {
  return new Promise(function (resolve, reject) {
    let output = '';
    const child = spawn(command, { cwd: cwd, shell: true });
    child.stdout.on('data', (data) => {
      if (log) process.stdout.write(data.toString());
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      reject(data.toString());
    });
    child.on('close', (code) => {
      if(!log) resolve(output.replace(/^\s+|\s+$/g, ''));
      resolve(code);
    });
  });
}

(async () => {
  try {
    const python_version = await executeCommand("python3 -V", __dirname, false);
    const versionNumber = python_version.match(PythonStringRegex)[0];

    if (!versionNumber.startsWith("3.")) {
      console.log("Python 3 is required to run this script. Please install Python 3 and try again.");
      process.exit(1);
    }

    let Start_String = "";
    if(process.env.BEGIN) {
      Start_String = ` -b ${process.env.BEGIN}`
    }

    await executeCommand(`python3 ./collect.py -t ${Buffer.from(process.env.WAKATOKEN).toString('base64')}${Start_String}`, __dirname, true);

    // Read stats from file, as UFT-8
    const stats = JSON.parse(fs.readFileSync(stats_path, 'utf-8'));

    // iterate over the stats object
    for (const date in stats) {
      if (new Date(date).getTime() / 1000 <= last_date) continue;
      for (const category in stats[date]) {
        let fields_obj = {};
        for (const item in stats[date][category]) {
          fields_obj[item] = stats[date][category][item];
        }
        if (Object.keys(fields_obj).length === 0) continue;

        const time = new Date(date).getTime() / 1000

        await db.write(
          {
            org: process.env.ORGA,
            bucket: process.env.BUCKET,
            precision: 's'
          },
          [{
            measurement: category,
            tags: { user: process.env.USER },
            fields: fields_obj,
            timestamp: time
          }]
        );

        console.log(`Wrote ${category} for ${date} to InfluxDB`);
        last_date = new Date(date).getTime() / 1000
      }
    }

    fs.writeFileSync(path.join(log_path, 'last_date.txt'), last_date.toString())
  } catch (error) {
    console.log(error);
  }
})();