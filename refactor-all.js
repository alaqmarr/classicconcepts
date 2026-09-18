const fs = require('fs');
const glob = require('path');

function checkFiles(dir) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
        const fullPath = glob.join(dir, file.name);
        if (file.isDirectory()) {
            checkFiles(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            refactor(fullPath);
        }
    }
}

function refactor(file) {
    let content = fs.readFileSync(file, 'utf8');

    // Find the action inside the default export
    const actionRegex = /async function update([A-Za-z]+)\(formData: FormData\) \{\s*\"use server\";([\s\S]*?)\}/g;
    
    let match;
    let modified = false;
    while ((match = actionRegex.exec(content)) !== null) {
        // Only if it's inside the component
        const actionBody = match[0];
        const funcName = 'update' + match[1];
        
        // Ensure we don't mess up if it's already outside
        if (content.indexOf(actionBody) < content.indexOf('export default async function')) {
            continue; // Already outside
        }
        
        const newActionBody = actionBody.replace(`async function ${funcName}(formData: FormData)`, `async function ${funcName}(id: string, formData: FormData)`);
        
        content = content.replace(actionBody, '');
        
        const exportRegex = new RegExp(`export default async function`);
        content = content.replace(exportRegex, newActionBody + '\n\n' + '$&');
        
        // Replace action={updateX} with action={updateX.bind(null, id)}
        const actionPropRegex = new RegExp(`action=\\{${funcName}\\}`);
        content = content.replace(actionPropRegex, `action={${funcName}.bind(null, id)}`);
        
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Refactored', file);
    }
}

checkFiles('./src/app/admin');
