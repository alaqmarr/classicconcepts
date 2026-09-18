const fs = require('fs');

function refactor(file) {
    let content = fs.readFileSync(file, 'utf8');

    const actionRegex = /async function updateProduct\(formData: FormData\) \{\s*\"use server\";([\s\S]*?)revalidatePath\(\"\/admin\/(products|podiums)\"\);\s*redirect\(\"\/admin\/\2\"\);\s*\}/;
    
    const match = content.match(actionRegex);
    if (!match) {
        console.log('No match for', file);
        return;
    }
    
    const actionBody = match[0];
    const newActionBody = actionBody.replace('async function updateProduct(formData: FormData)', 'async function updateProduct(id: string, formData: FormData)');
    
    content = content.replace(actionBody, '');
    
    const exportRegex = /export default async function (EditProductPage|EditPodiumPage)/;
    content = content.replace(exportRegex, newActionBody + '\n\n' + '$&');
    
    content = content.replace(/action=\{updateProduct\}/, 'action={updateProduct.bind(null, id)}');

    fs.writeFileSync(file, content, 'utf8');
    console.log('Refactored', file);
}

refactor('src/app/admin/(dashboard)/products/[id]/page.tsx');
refactor('src/app/admin/(dashboard)/podiums/[id]/page.tsx');
