const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const execa = require('execa');
const Listr = require('listr');


function DeployError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
}

function handleError(err) {
  const message = (err instanceof DeployError ? err.message : String(err.stack || err.message || err));
  console.error('Deploy error: ' + (message) + '\n');
  process.exit(-1);
}

function rimrafPromised(path) {
  return new Promise((resolve, reject) => {
    rimraf(path, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

function statPromised(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stats);
    });
  });
}

function ensureFileSystemItem(pathToFileSystemItem, itemType) {
  return statPromised(pathToFileSystemItem).catch((err) => {
    if (err.code === 'ENOENT') {
      throw new DeployError('Expected a ' + itemType + ', found nothing at ' + pathToFileSystemItem);
    }
    else {
      throw new DeployError('Expected a ' + itemType + ', failed to check ' + pathToFileSystemItem);
    }
  }).then((stats) => {
    if (
      (itemType === 'directory' && stats.isDirectory()) ||
      (itemType === 'file' && stats.isFile())
    ) {
      return;
    }

    throw new DeployError('Expected a ' + itemType + ', found something else at ' + pathToFileSystemItem);
  });
}

function ensureDirectory(pathToDir) {
  return ensureFileSystemItem(pathToDir, 'directory');
}

function ensureFile(pathToFile) {
  return ensureFileSystemItem(pathToFile, 'file');
}

function deploy() {
  const rootDir = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(rootDir, 'package.json');

  // NOTE(@sompylasar): `react-scripts` compile into `build`.
  const buildDirPath = path.join(rootDir, 'build');
  const buildDirGitPath = path.join(buildDirPath, '.git');

  const packageJson = require(packageJsonPath);

  // NOTE(@sompylasar): The following line depends on `package.json` "repository" to hold a string, not an object.
  const repositoryUrl = packageJson.repository;
  const repositoryAuthor = packageJson.author;

  // NOTE(@sompylasar): Use `master` for `username.github.io` (user pages), `gh-pages` for project pages.
  const deployBranch = 'master';

  const tasks = new Listr([
    {
      title: 'Checking the build...',
      task: () => {
        return ensureDirectory(buildDirPath).then(() => ensureFile(path.join(buildDirPath, 'index.html')));
      },
    },
    {
      title: 'Removing old git repo...',
      task: () => rimrafPromised(buildDirGitPath),
    },
    {
      title: 'Initializing new git repo...',
      task: () => execa('git', [ 'init' ], { cwd: buildDirPath }),
    },
    {
      title: 'Adding all files to git repo...',
      task: () => execa('git', [ 'add', '.' ], { cwd: buildDirPath }),
    },
    {
      title: 'Committing...',
      task: () => execa('git', [ 'commit', '--message', 'Deploy to GitHub Pages', '--author', repositoryAuthor ], { cwd: buildDirPath }),
    },
    {
      title: 'Pushing...',
      skip: () => true,  // TODO(@sompylasar): Remove when ready.
      task: () => execa('git', [ 'push', '--force', repositoryUrl, 'master:' + deployBranch ], { cwd: buildDirPath }),
    },
  ]);

  console.log('Deploy started.');

  tasks.run().then(() => {
    console.log('Deploy succeeded.\n');
  }).catch((err) => {
    handleError(err);
  });
}

deploy();
