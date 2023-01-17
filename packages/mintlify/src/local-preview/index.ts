import Chalk from "chalk";
import child_process from "child_process";
import open from "open";
import fse, { pathExists } from "fs-extra";
import inquirer from "inquirer";
import { isInternetAvailable } from "is-internet-available";
import path from "path";
import shell from "shelljs";
import { Octokit } from "@octokit/rest";
import {
  CLIENT_PATH,
  HOME_DIR,
  DOT_MINTLIFY,
  CMD_EXEC_PATH,
  TARGET_MINT_VERSION,
  VERSION_PATH,
} from "../constants.js";
import { buildLogger, ensureYarn } from "../util.js";
import listener from "./listener/index.js";
import { ArgumentsCamelCase } from "yargs";

const shellExec = (cmd: string) => {
  return shell.exec(cmd, { silent: true });
};

const nodeModulesExists = async () => {
  return pathExists(path.join(DOT_MINTLIFY, "mint", "client", "node_modules"));
};

const promptForYarn = async () => {
  const yarnInstalled = shell.which("yarn");
  if (!yarnInstalled) {
    await inquirer
      .prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "yarn must be globally installed. Install yarn?",
          default: true,
        },
      ])
      .then(({ confirm }) => {
        if (confirm) {
          shell.exec("npm install --global yarn");
        } else {
          console.log("Installation cancelled.");
        }
      });
  }
};

const dev = async (argv: ArgumentsCamelCase) => {
  shell.cd(HOME_DIR);
  await promptForYarn();
  const logger = buildLogger("Starting a local Mintlify instance...");
  await fse.ensureDir(path.join(DOT_MINTLIFY, "mint"));
  const MINT_PATH = path.join(DOT_MINTLIFY, "mint");
  shell.cd(MINT_PATH);

  // The CLI can only run offline if Mint was already downloaded
  const internet = await isInternetAvailable();
  if (!internet && !(await pathExists(CLIENT_PATH))) {
    logger.fail(
      "Running mintlify dev for the first time requires an internet connection."
    );
    process.exit(1);
  }

  // Avoid checking if we are on the target Mint if we are offline
  if (internet) {
    const mintVersionExists = await pathExists(VERSION_PATH);

    // We always download the target version of Mintlify if the mint-version.txt file doesn't exist.
    // We do this because users updating from an older version of the CLI never have mint-version.txt set.
    let downloadTargetMint = !mintVersionExists;

    // Download target mint if the current version is different. Keep in mind this also allows
    // downgrading to an older version of Mintlify by installing an older CLI version.
    if (mintVersionExists) {
      const currVersion = fse.readFileSync(VERSION_PATH, "utf8");
      if (currVersion !== TARGET_MINT_VERSION) {
        downloadTargetMint = true;
      }
    }

    if (downloadTargetMint) {
      // Delete any existing contents
      fse.emptyDirSync(MINT_PATH);

      logger.text = "Downloading Mintlify framework...";

      const octokit = new Octokit();
      const downloadRes = await octokit.repos.downloadTarballArchive({
        owner: "mintlify",
        repo: "mint",
        ref: TARGET_MINT_VERSION,
      });

      logger.text = "Extracting Mintlify framework...";
      const TAR_PATH = path.join(MINT_PATH, "mint.tar.gz");

      // Unzip tar file
      fse.writeFileSync(TAR_PATH, Buffer.from(downloadRes.data as any));
      shellExec("tar -xzf mint.tar.gz");

      // List all files in tar file and get the first one.
      // There is never anything else in the tar file, so this is safe.
      // We do this because the folder name includes the commit sha, so we can't hardcode it.
      // Lastly, we call .trim() to remove the newline character.
      const extractedFolderName = shellExec(
        'tar -tzf mint.tar.gz | head -1 | cut -f1 -d"/"'
      ).stdout.trim();

      // Delete tar file
      fse.removeSync(TAR_PATH);

      fse.moveSync(
        path.join(MINT_PATH, extractedFolderName, "client"),
        path.join(CLIENT_PATH)
      );

      // Store the currently downloaded version
      fse.writeFileSync(VERSION_PATH, TARGET_MINT_VERSION);

      // Delete unnecessary contents downloaded from GitHub
      fse.removeSync(path.join(MINT_PATH, extractedFolderName));

      logger.text = "Installing dependencies...";

      ensureYarn(logger);
      shell.cd(CLIENT_PATH);
      shellExec("yarn");
    }
  }

  if (!(await nodeModulesExists())) {
    if (!internet) {
      logger.fail(`Dependencies are missing and you are offline. Connect to the internet and run
  
      mintlify install
      
      `);
    } else {
      logger.fail(`Dependencies were not installed correctly, run
  
      mintlify install
      
      `);
    }
    process.exit(1);
  }

  const relativePath = path.relative(CLIENT_PATH, CMD_EXEC_PATH);
  shellExec(`yarn preconfigure ${relativePath}`);
  logger.succeed("Local Mintlify instance started.");
  run((argv.port as string) || "3000");
};

const run = (port: string) => {
  shell.cd(CLIENT_PATH);
  console.log(
    `🌿 ${Chalk.green(
      `Your local preview is available at http://localhost:${port}`
    )}`
  );
  console.log(
    `🌿 ${Chalk.green("Press Ctrl+C any time to stop the local preview.")}`
  );

  // next-remote-watch can only receive ports as env variables
  // https://github.com/hashicorp/next-remote-watch/issues/23
  const mintlifyDevProcess = child_process.spawn("npm run dev-watch", {
    env: {
      ...process.env,
      PORT: port,
    },
    cwd: CLIENT_PATH,
    stdio: "pipe",
    shell: true,
  });
  mintlifyDevProcess.stdout.on("data", (data) => {
    const output = data.toString();
    console.log(output);
    if (output.startsWith("> Ready on http://localhost:")) {
      open(`http://localhost:${port}`);
    }
  });
  const onExit = () => {
    mintlifyDevProcess.kill("SIGINT");
    process.exit(0);
  };
  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);
  listener();
};

export default dev;
