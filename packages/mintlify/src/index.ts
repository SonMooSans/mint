#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  scrapePageAutomatically,
  scrapePageWrapper,
} from "./scraping/scrapePageCommands.js";
import { scrapeGitBookPage } from "./scraping/site-scrapers/scrapeGitBookPage.js";
import { scrapeReadMePage } from "./scraping/site-scrapers/scrapeReadMePage.js";
import {
  scrapeSectionAutomatically,
  scrapeSectionAxiosWrapper,
  scrapeGitbookSectionCommand,
} from "./scraping/scrapeSectionCommands.js";
import { scrapeReadMeSection } from "./scraping/site-scrapers/scrapeReadMeSection.js";
import dev from "./local-preview/index.js";
import installDepsCommand from "./local-preview/helper-commands/installDepsCommand.js";

yargs(hideBin(process.argv))
  .command(
    "dev",
    "Runs Mintlify locally (Must run in directory with mint.json)",
    () => {},
    async () => {
      await dev();
    }
  )
  .command(
    "install",
    "Install dependencies for local Mintlify",
    () => {},
    installDepsCommand
  )
  .command(
    "scrape-page [url]",
    "Scrapes a page",
    () => {},
    async (argv) => {
      await scrapePageAutomatically(argv);
    }
  )
  .command(
    "scrape-gitbook-page [url]",
    "Scrapes a GitBook page",
    () => {},
    async (argv) => {
      await scrapePageWrapper(argv, scrapeGitBookPage);
    }
  )
  .command(
    "scrape-readme-page [url]",
    "Scrapes a ReadMe page",
    () => {},
    async (argv) => {
      await scrapePageWrapper(argv, scrapeReadMePage);
    }
  )
  .command(
    "scrape-section [url]",
    "Scrapes the docs in the section",
    () => {},
    async (argv) => {
      await scrapeSectionAutomatically(argv);
    }
  )
  .command(
    "scrape-gitbook-section [url]",
    "Scrapes the Gitbook section",
    () => {},
    async (argv) => {
      await scrapeGitbookSectionCommand(argv);
    }
  )
  .command(
    "scrape-readme-section [url]",
    "Scrapes the ReadMe section",
    () => {},
    async (argv) => {
      await scrapeSectionAxiosWrapper(argv, scrapeReadMeSection);
    }
  )

  // Print the help menu when the user enters an invalid command.
  .demandCommand(
    1,
    "Unknown command. See above for the list of supported commands."
  )

  // Alias option flags --help = -h, --version = -v
  .alias("h", "help")
  .alias("v", "version")

  .parse();
