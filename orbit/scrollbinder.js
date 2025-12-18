#!/usr/bin/env node
/**
 * ScrollBinder - Unified Search Across All Systems
 *
 * Search targets:
 * - Mac local files (via Spotlight)
 * - Google Drive (via rclone)
 * - iCloud Drive
 * - OneDrive
 * - Cloudflare R2
 * - Zoho Creator database
 * - GitHub repositories
 * - HotStack uploads
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const chalk = require('chalk');

class ScrollBinder {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.maxResults = options.maxResults || 10;
    this.timeout = options.timeout || 10000;

    this.sources = [
      { name: 'Mac Local', icon: '💻', enabled: process.platform === 'darwin', search: this.searchMac },
      { name: 'Google Drive', icon: '📁', enabled: true, search: this.searchGoogleDrive },
      { name: 'iCloud Drive', icon: '☁️', enabled: process.platform === 'darwin', search: this.searchiCloudDrive },
      { name: 'OneDrive', icon: '📦', enabled: true, search: this.searchOneDrive },
      { name: 'Cloudflare R2', icon: '🌐', enabled: true, search: this.searchR2 },
      { name: 'Zoho Creator', icon: '🗄️', enabled: true, search: this.searchZoho },
      { name: 'GitHub', icon: '🐙', enabled: true, search: this.searchGitHub },
      { name: 'HotStack', icon: '🔥', enabled: true, search: this.searchHotStack }
    ];
  }

  async search(query, options = {}) {
    console.log(chalk.bold.cyan(`\n🔍 ScrollBinder Universal Search: "${query}"\n`));

    const sources = options.sources
      ? this.sources.filter(s => options.sources.includes(s.name.toLowerCase().replace(' ', '-')))
      : this.sources.filter(s => s.enabled);

    const promises = sources.map(async source => {
      const startTime = Date.now();
      try {
        const results = await Promise.race([
          source.search.call(this, query, options),
          this.timeout > 0 ? new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          ) : Promise.resolve([])
        ]);

        return {
          source: source.name,
          icon: source.icon,
          results: results || [],
          count: (results || []).length,
          time: Date.now() - startTime
        };
      } catch (error) {
        return {
          source: source.name,
          icon: source.icon,
          results: [],
          count: 0,
          error: error.message,
          time: Date.now() - startTime
        };
      }
    });

    const allResults = await Promise.all(promises);

    // Display results
    this.displayResults(allResults, query);

    return allResults;
  }

  displayResults(allResults, query) {
    let totalCount = 0;

    allResults.forEach(({ source, icon, results, count, error, time }) => {
      totalCount += count;

      if (error) {
        console.log(chalk.red(`${icon} ${source}: Error - ${error}`));
        return;
      }

      if (count === 0) {
        console.log(chalk.gray(`${icon} ${source}: No results`));
        return;
      }

      console.log(chalk.green.bold(`\n${icon} ${source}: ${count} results (${time}ms)`));

      const displayResults = results.slice(0, this.maxResults);
      displayResults.forEach((result, index) => {
        const number = chalk.gray(`   ${index + 1}.`);
        const name = chalk.white(result.name);
        const path = chalk.gray(this.truncatePath(result.path, 60));
        const size = result.size ? chalk.yellow(` (${this.formatSize(result.size)})`) : '';

        console.log(`${number} ${name}`);
        console.log(`      ${path}${size}`);
      });

      if (count > this.maxResults) {
        console.log(chalk.gray(`      ... and ${count - this.maxResults} more`));
      }
    });

    console.log(chalk.bold.cyan(`\n📊 Total Results: ${totalCount} across ${allResults.length} sources\n`));
  }

  async searchMac(query) {
    if (process.platform !== 'darwin') return [];

    try {
      const { stdout } = await execPromise(`mdfind -name "${query}"`);
      return stdout.split('\n')
        .filter(Boolean)
        .map(fullPath => {
          const stats = require('fs').statSync(fullPath, { throwIfNoEntry: false });
          return {
            name: fullPath.split('/').pop(),
            path: fullPath,
            source: 'mac',
            size: stats?.size
          };
        });
    } catch (error) {
      return [];
    }
  }

  async searchGoogleDrive(query) {
    try {
      const { stdout } = await execPromise(`rclone lsf google-drive: --include "*${query}*" --max-depth 5`);
      return stdout.split('\n')
        .filter(Boolean)
        .map(name => ({
          name: name.replace('/', ''),
          path: `google-drive:${name}`,
          source: 'google-drive'
        }));
    } catch (error) {
      return [];
    }
  }

  async searchiCloudDrive(query) {
    if (process.platform !== 'darwin') return [];

    try {
      const icloudPath = `${process.env.HOME}/Library/Mobile Documents/com~apple~CloudDocs`;
      const { stdout } = await execPromise(`find "${icloudPath}" -iname "*${query}*" -type f`);
      return stdout.split('\n')
        .filter(Boolean)
        .map(fullPath => {
          const stats = require('fs').statSync(fullPath, { throwIfNoEntry: false });
          return {
            name: fullPath.split('/').pop(),
            path: fullPath.replace(icloudPath, 'icloud:'),
            source: 'icloud',
            size: stats?.size
          };
        });
    } catch (error) {
      return [];
    }
  }

  async searchOneDrive(query) {
    try {
      const { stdout } = await execPromise(`rclone lsf onedrive: --include "*${query}*" --max-depth 5`);
      return stdout.split('\n')
        .filter(Boolean)
        .map(name => ({
          name: name.replace('/', ''),
          path: `onedrive:${name}`,
          source: 'onedrive'
        }));
    } catch (error) {
      return [];
    }
  }

  async searchR2(query) {
    try {
      const { stdout } = await execPromise(`rclone lsf cloudflare-r2:hsomni9000-vault --include "*${query}*" --max-depth 10`);
      return stdout.split('\n')
        .filter(Boolean)
        .map(name => ({
          name: name.split('/').pop(),
          path: `r2:hsomni9000-vault/${name}`,
          source: 'cloudflare-r2'
        }));
    } catch (error) {
      return [];
    }
  }

  async searchZoho(query) {
    try {
      const response = await axios.get(
        'https://creator.zoho.com/api/v2/HSOMNI9000_Index/report/All_Files',
        {
          params: { criteria: `File_Name.contains("${query}")` },
          headers: {
            'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
          }
        }
      );

      return (response.data?.data || []).map(file => ({
        name: file.File_Name,
        path: file.R2_Path,
        source: 'zoho-creator',
        size: file.File_Size,
        uploadDate: file.Upload_Date
      }));
    } catch (error) {
      return [];
    }
  }

  async searchGitHub(query) {
    try {
      const response = await axios.get(
        `https://api.github.com/search/code?q=${query}+user:heyns1000`,
        {
          headers: {
            'Authorization': `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      return (response.data?.items || []).map(item => ({
        name: item.name,
        path: item.html_url,
        source: 'github',
        repo: item.repository.full_name
      }));
    } catch (error) {
      return [];
    }
  }

  async searchHotStack(query) {
    // Search HotStack uploads in R2
    try {
      const { stdout } = await execPromise(`rclone lsf cloudflare-r2:hsomni9000-vault/hotstack --include "*${query}*" --max-depth 10`);
      return stdout.split('\n')
        .filter(Boolean)
        .map(name => ({
          name: name.split('/').pop(),
          path: `r2:hsomni9000-vault/hotstack/${name}`,
          source: 'hotstack'
        }));
    } catch (error) {
      return [];
    }
  }

  truncatePath(path, maxLength) {
    if (path.length <= maxLength) return path;
    const half = Math.floor((maxLength - 3) / 2);
    return path.substring(0, half) + '...' + path.substring(path.length - half);
  }

  formatSize(bytes) {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse flags
  const flags = {
    verbose: args.includes('-v') || args.includes('--verbose'),
    help: args.includes('-h') || args.includes('--help'),
    sources: null,
    maxResults: 10
  };

  // Extract query (non-flag arguments)
  const query = args.filter(arg => !arg.startsWith('-')).join(' ');

  if (flags.help || !query) {
    console.log(`
${chalk.bold.cyan('ScrollBinder - Unified Search Tool')}

${chalk.bold('Usage:')}
  scroll-search [options] <query>

${chalk.bold('Options:')}
  -v, --verbose          Show detailed output
  -h, --help             Show this help message
  --sources <sources>    Comma-separated list of sources to search
  --max <number>         Maximum results per source (default: 10)

${chalk.bold('Examples:')}
  scroll-search "invoice 2024"
  scroll-search --sources mac,google-drive "contract"
  scroll-search -v "api key"

${chalk.bold('Available Sources:')}
  mac, google-drive, icloud, onedrive, r2, zoho, github, hotstack
    `);
    process.exit(0);
  }

  // Parse sources
  const sourcesIndex = args.indexOf('--sources');
  if (sourcesIndex >= 0 && args[sourcesIndex + 1]) {
    flags.sources = args[sourcesIndex + 1].split(',');
  }

  // Parse max results
  const maxIndex = args.indexOf('--max');
  if (maxIndex >= 0 && args[maxIndex + 1]) {
    flags.maxResults = parseInt(args[maxIndex + 1]) || 10;
  }

  const scrollbinder = new ScrollBinder({
    verbose: flags.verbose,
    maxResults: flags.maxResults
  });

  scrollbinder.search(query, { sources: flags.sources }).catch(error => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}

module.exports = ScrollBinder;
