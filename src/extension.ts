// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function helloWorld() {
	// Display a message box to the user
	vscode.window.showInformationMessage('Hello World from getref!');

}
export function activate(context: vscode.ExtensionContext) {

	interface Author {
		text: string;
	}

	interface HitInfo {
		title: string;
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



	console.log('Congratulations, your extension "getref" is now active!');

	let disposable = vscode.commands.registerCommand('getref.insertFromURL', async () => {

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
		
		const url = new URL('http://dblp.uni-trier.de/search/publ/api');
		url.searchParams.append('q', query);
		url.searchParams.append('h', '100');
		url.searchParams.append('format', 'json');

		try {
			
            const response = await fetch(url.toString(), { 
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            const json =  await response.json() as DBLP;;
			const hits = json["result"]["hits"]["hit"];
			


			const picks: PickItem[] = hits.map((pub: Hit) => {

				// Normalize the authors to always be an array
				const authors = Array.isArray(pub.info.authors.author) ? pub.info.authors.author : [pub.info.authors.author];
				
				return {
					label: pub.info.title,
					detail: authors.map((a: Author) => typeof a === 'object' ? a.text : a).join(', '), 
					key: pub.info.key 
				};
            });

            const selectedPub = await vscode.window.showQuickPick(picks, {
                placeHolder: 'Select a publication to insert BibTeX'
				// onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${item}`)
            });

            if (selectedPub) {

				vscode.window.showInformationMessage(`Inserting ${selectedPub.key}`);
                // Fetch the BibTeX using selectedPub.bibtex if necessary
                // For this example, we'll just insert the URL as a placeholder
                
				const biburl = `http://dblp.uni-trier.de/rec/bib0/${selectedPub.key}.bib`;

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
