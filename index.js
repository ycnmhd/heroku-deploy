const core = require('@actions/core');
const { promisify } = require('util');

const exec = promisify(require('child_process').exec);

async function loginHeroku() {
  const login = core.getInput('email');
  const password = core.getInput('api_key');

  try {
    await exec(`echo ${password} | docker login --username=${login} registry.heroku.com --password-stdin`);
    console.log('Logged in succefully ✅');
  } catch (error) {
    core.setFailed(`Authentication process faild. Error: ${error.message}`);
  }
}

async function buildPushAndDeploy() {
  const appName = core.getInput('app_name');
  const names = appName.includes(';') ? appName.split(';') : [appName];

  for await (const appName of names.filter(Boolean)) {
    const herokuAction = herokuActionSetUp(appName);

    try {
      console.log('Processing app: ' + appName);
      await exec(herokuAction('push'));
      console.log('Container pushed to Heroku Container Registry ⏫');

      await exec(herokuAction('release'));
      console.log('App Deployed successfully 🚀');
    } catch (error) {
      core.setFailed(`Something went wrong building your image. Error: ${error.message}`);
    }
  }
}

/**
 *
 * @param {string} appName - Heroku App Name
 * @returns {function}
 */
function herokuActionSetUp(appName) {
  const HEROKU_API_KEY = core.getInput('api_key');
  const exportKey = `HEROKU_API_KEY="${HEROKU_API_KEY}"`;
  const dockerFilePath = core.getInput('dockerfile_path');
  const CD = dockerFilePath ? `cd "${dockerFilePath}" ; ` : '';
  /**
   * @typedef {'push' | 'release'} Actions
   * @param {Actions} action - Action to be performed
   * @returns {string}
   */
  return function herokuAction(action) {
    return `${CD} ${exportKey} heroku container:${action} web --app ${appName}`;
  };
}

loginHeroku()
  .then(() => buildPushAndDeploy())
  .catch((error) => {
    console.log({ message: error.message });
    core.setFailed(error.message);
  });
