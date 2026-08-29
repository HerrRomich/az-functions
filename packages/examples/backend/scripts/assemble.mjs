import { path7za } from '7zip-bin';
import { execSync } from 'node:child_process';
import * as fs from "node:fs";

fs.copyFileSync('./host.deploy.json', './dist/host.json');
fs.copyFileSync('./package.deploy.json', './dist/package.json');
execSync(`${path7za} a console-backend.zip host.json package.json *.cjs assets open-api-definitions`, { stdio: 'inherit', cwd: './dist' });
