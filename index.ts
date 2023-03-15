import * as fs from 'fs';

type OutdatedObject = {
    Package: string;
    Current: string;
    Wanted: string;
    Latest: string;
    Location: string;
    DependedBy: string;
}

const OutdatedMapping: string[] = [
    'nop',
    'Location',
    'Wanted',
    'Current',
    'Latest',
    'DependedBy',
];

class MatcherHandler {
    value: RegExpMatchArray | null;

    constructor(value: RegExpMatchArray | null) {
        this.value = value;
    }

    parsePackage(packageName: string): string[] {
        const startWithAt = packageName.startsWith('@');
        if (startWithAt) {
            packageName = packageName.substring(1, packageName.length);
        }
        const match = packageName.match(/([^@]*)@(.*)/);
        if (match === null) return ['null', 'null'];
        if (startWithAt) {
            match[1] = `@${match[1]}`;
        }
        return [match[1], match[2]];
    }

    get(): OutdatedObject | undefined {
        if (this.value === null) return undefined;
        const result: OutdatedObject = {
            Package: '',
            Current: '',
            Wanted: '',
            Latest: '',
            Location: '',
            DependedBy: ''
        };
        let i = 0;
        this.value.forEach(match => {
            const type: string = OutdatedMapping[i];
            if (type === 'Location') {
                result.Location = match;
            }
            if (type === 'Wanted') {
                const parsed = this.parsePackage(match);
                result.Package = parsed[0];
                result.Wanted = parsed[1];
            }
            if (type === 'Current') {
                const parsed = this.parsePackage(match);
                result.Current = parsed[1];
            }
            if (type === 'Latest') {
                const parsed = this.parsePackage(match);
                result.Latest = parsed[1];
            }
            if (type === 'DependedBy') {
                result.DependedBy = match;
            }
            i++;
        });
        return result;
    }
}

const files: string[] = fs.readdirSync('./to_parse');

console.log(`${files.length} file(s) found`);

const dataRead: OutdatedObject[] = [];

files.forEach(file => {
    console.log(`Parsing ${file}...`);
    const content = fs.readFileSync(`./to_parse/${file}`, {encoding: 'utf-8'}).split('\n');
    content.forEach(line => {
        const res = new MatcherHandler(line.match(/.*(node_modules\/[^:]*):([^:]*):([^:]*):([^:]*):([^:]*)/)).get();
        if (res) {
            dataRead.push(res);
        }
    });
});

console.log('Parsing finished');

if (fs.readdirSync('./output').length !== 1) {
    console.log('Removing old file...');
    fs.rmSync('./output/output.json');
    fs.rmSync('./output/output.tsv');
}

console.log('Saving file as json');
fs.appendFileSync('./output/output.json', JSON.stringify(dataRead));

console.log('Saving file as tsv');
let tsv = '';
dataRead.forEach(o => tsv += `${o.Package}\t${o.Current}\t${o.Wanted}\t${o.Latest}\t${o.Location}\t${o.DependedBy}\n`);
fs.appendFileSync('./output/output.tsv', tsv);

console.log('Done, exiting...');
