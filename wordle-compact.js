
let s = () => {

let setAttribute = (elem, attr, value) => {
    elem.setAttribute(attr, value);
}

let shadowQuery = (elem, query) => {
    let root = elem.shadowRoot;
    if (!root)
	return null;
    return root.querySelector(query);
};

let shadowQueryAll = (elem, query) => {
    let root = elem.shadowRoot;
    if (!root)
	return [];
    return root.querySelectorAll(query);
};

let fix = (elem, makeClickable, role, label) => {
    if (role) {
	if (role == 'tile') {
            setAttribute(elem, 'role', 'img');
            setAttribute(elem, 'aria-roledescription', 'tile');
	} else {
            setAttribute(elem, 'role', role);
	}
        if (role == 'dialog') {
            setAttribute(elem, 'aria-modal', false);
        }
    }

    if (label) {
        setAttribute(elem, 'aria-label', label);
    }
    
    if (makeClickable) {
        if (elem.tabIndex == 0)
            return;

        elem.tabIndex = 0;
        elem.addEventListener('keydown', (e) => {
            if (e.code == 'Enter' || e.code == 'Space') {
                e.stopPropagation();
                e.preventDefault();
		let switchChild = shadowQuery(elem, 'div.switch');
		if (switchChild) {
		    switchChild.click();
		} else {
                    elem.click();
		}
            }
        }, false);
    }
}

let masterFixer = (elem) => {
    let newLabel = '';
    ['letter', 'evaluation', 'data-key', 'data-state'].forEach(attr => {
	let value = elem.getAttribute(attr);
	if (value) {
	    newLabel += ' ' + value;
	}
    });
    if (newLabel != elem.getAttribute('aria-label')) {
	setAttribute(elem, 'aria-label', newLabel);
    }
};

let fixAllTiles = (root) => {
    let tiles = shadowQueryAll(root, 'game-tile');
    for (let j = 0; j < tiles.length; j++) {
	fix(tiles[j], true, 'tile', 'Tile');
	masterFixer(tiles[j]);
    }
};

let masterObserver = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
	masterFixer(mutation.target);
    }
});

let watchTile = (tile) => {
    fix(tile, false, 'tile', 'Empty');
    setAttribute(tile, 'aria-live', 'polite');
    masterFixer(tile);
    masterObserver.observe(tile, { attributes: true });
}

let watchKey = (key) => {
    masterObserver.observe(key, { attributes: true });
}

let checkboxObserver = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
	let checkbox = mutation.target;
	let newAttr = '' + checkbox.hasAttribute('checked');
	if (newAttr != checkbox.getAttribute('aria-checked')) {
	    setAttribute(checkbox, 'aria-checked', newAttr);
	}
    }
});

let watchCheckbox = (checkbox) => {
    if (!checkbox.hasAttribute('aria-checked')) {
	fix(checkbox, true, 'checkbox', checkbox.getAttribute('name'));
	setAttribute(checkbox, 'aria-checked',
			      checkbox.hasAttribute('checked'));
    }
    checkboxObserver.observe(checkbox, { attributes: true });
}

let app;
let previousModalState;
let firstKey;

let modalObserver = new MutationObserver((mutationsList, observer) => {
    let modal = mutationsList[0].target;
    let state = modal.hasAttribute('open');
    if (previousModalState !== undefined && state != previousModalState) {
	setTimeout(() => {
	    if (state) {
		let stats = shadowQuery(app, 'game-stats');
		if (stats) {
		    let button = shadowQuery(stats, 'button');
		    if (button) {
			button.focus();
		    }
		}
	    } else {
		if (firstKey)
		    firstKey.focus();
	    }
	}, 1000);
    }
    previousModalState = state;
});

let watchModal = (modal) => {
    previousModalState = modal.hasAttribute('open');
    modalObserver.observe(modal,  { attributes: true });
}

let previousGamePageState;

let gamePageObserver = new MutationObserver((mutationsList, observer) => {
    let gamePage = mutationsList[0].target;
    let state = gamePage.hasAttribute('open');
    if (previousGamePageState !== undefined &&
	state != previousGamePageState) {

	if (state) {
	    fix(gamePage, false, 'dialog', 'Game Modal');
	}

	setTimeout(() => {
	    if (state) {
		let close = shadowQuery(gamePage, 'game-icon[icon=close]');
		if (close) {
                    fix(close, true, 'button', 'Close');
		}

		let gameSettings = shadowQuery(app, 'game-settings');
		if (gameSettings) {
		    setAttribute(gamePage, 'aria-label', 'Settings Modal');
		    let checkboxes = shadowQueryAll(gameSettings, 'game-switch');
		    for (let i = 0; i < checkboxes.length; i++)
			watchCheckbox(checkboxes[i]);

		    let checkbox = shadowQuery(gameSettings, 'game-switch');
		    if (checkbox) {
			checkbox.focus();
		    }
		}

		let help = shadowQuery(app, 'game-help');
		if (help) {
		    setAttribute(gamePage, 'aria-label', 'Help Modal');

		    fixAllTiles(help);
		    
		    close.focus();
		}
	    } else {
		if (firstKey)
		    firstKey.focus();
	    }
	}, 500);
    }
    previousGamePageState = state;
});

let watchGamePage = (gamePage) => {
    previousGamePageState = gamePage.hasAttribute('open');
    gamePageObserver.observe(gamePage,  { attributes: true });
};

let applyFixes = () => {
    app = document.querySelector('game-app');
    if (app) {
        let modal = shadowQuery(app, 'game-modal');
        if (modal) {
            fix(modal, false, 'dialog', 'Pop-up Modal');

            let close = shadowQuery(modal, 'game-icon[icon=close]');
            if (close) {
                fix(close, true, 'button', 'Close');
                setTimeout(() => {
                    close.focus();
                }, 1000);
            }
        }

	watchModal(modal);
	
        let help = shadowQuery(app, 'game-help');
	if (help) {
	    fixAllTiles(help);
	}

	let toasters = shadowQueryAll(app, '.toaster');
	for (let i = 0; i < toasters.length; i++) {
	    setAttribute(toasters[i], 'aria-live', 'polite');
	}

        let gamePage = shadowQuery(app, 'game-page');
	watchGamePage(gamePage);

        let keyboard = shadowQuery(app, 'game-keyboard');
	fix(keyboard, false, 'group', 'Keyboard');

	let keys = shadowQueryAll(keyboard, 'button[data-key]');
	for (let i = 0; i < keys.length; i++) {
	    if (!firstKey) {
		firstKey = keys[i];
	    }
	    watchKey(keys[i]);
	}

        let backspace = shadowQuery(keyboard, 'button[data-key=←]');
        fix(backspace, false, null, 'backspace');

        let rows = shadowQueryAll(app, 'game-row');
        for (let i = 0; i < rows.length; i++) {
	    fix(rows[i], false, 'group', 'Row ' + (i + 1));

            let tiles = shadowQueryAll(rows[i], 'game-tile');
            for (let j = 0; j < tiles.length; j++) {
                watchTile(tiles[j]);
            }
        }

	let extensionCredit = document.createElement('div');
	extensionCredit.innerHTML = 'Wordle screen reader accessibility extension running.';
	rows[rows.length - 1].parentElement.appendChild(extensionCredit);
    }
};

setTimeout(() => {
    applyFixes();
}, 1000);


};
s();

