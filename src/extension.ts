import * as vscode from 'vscode';

interface Author {
	text: string;
}

interface HitInfo {
	title: string;
	year: number;
	venue: string;
	key: string;
	authors: { author: Author[] };
}

interface Hit {
	info: HitInfo;
}

interface Hits {
	hit: Hit[];
}

interface DBLP {
	result: { hits: Hits };
}


interface PickItem {
	label: string;
	detail: string;
	key: string; 
}

export function activate(context: vscode.ExtensionContext) {


	let disposable = vscode.commands.registerCommand('getref.insert_reference', async () => {

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }

        // Prompt the user to enter a URL
        const query = await vscode.window.showInputBox({
            prompt: 'Enter the search query',
            placeHolder: 'Isaksson'
        });

        if (!query) {
            vscode.window.showErrorMessage('Query is required!');
            return;
        }
		
		let configuration = vscode.workspace.getConfiguration('getref');
		const style = configuration.get<number>("style", 0);
	
		const url = new URL('http://dblp.uni-trier.de/search/publ/api');
		url.searchParams.append('q', query);
		url.searchParams.append('h', '100');
		url.searchParams.append('format', 'json');

		try {
			
            const response = await fetch(url.toString(), { 
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            const json =  await response.json() as DBLP;
			const hits = json["result"]["hits"]["hit"];
			
			const picks: PickItem[] = hits.map((pub: Hit) => {

				// Normalize the authors to always be an array
				const authors = Array.isArray(pub.info.authors.author) ? pub.info.authors.author : [pub.info.authors.author];

				const author_str = authors.map((a: Author) => typeof a === 'object' ? a.text : a).join(', ');

				return {
					label: pub.info.title,
					detail: `${author_str}, ${pub.info.venue}, ${pub.info.year}`, 
					key: pub.info.key 
				};
            });

            const selectedPub = await vscode.window.showQuickPick(picks, {
                placeHolder: 'Select a publication to insert BibTeX'
				// onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${item}`)
            });

            if (selectedPub) {

				vscode.window.showInformationMessage(`Inserting ${selectedPub.key}`);


				const biburl = `http://dblp.uni-trier.de/rec/${selectedPub.key}.bib?param=${style}`;
				
				const responsebib = await fetch(biburl);
				
				if (!responsebib.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const text = await responsebib.text();

				editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, text);
                });


            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error searching DBLP: ${error}`);
        }
    });

    context.subscriptions.push(disposable);

}

// This method is called when your extension is deactivated
export function deactivate() {}
