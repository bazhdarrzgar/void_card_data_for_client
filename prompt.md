Act as an expert Full-Stack Developer specializing in Vue 3 (Composition API) and Node.js with SQLite. 

I need you to build a local dataset management web application based on a specific wireframe I have designed. The primary goal is to load, edit, search, and export tabular data efficiently.

### Tech Stack Request
* **Frontend:** Vue 3 (Composition API), Tailwind CSS (for quick, clean styling), `SheetJS` (for parsing and exporting CSV/XLSX), and `Fuse.js` (for client-side fuzzy search).
* **Backend:** Node.js with Express and `better-sqlite3` (for synchronous, fast database interactions).

### UI Layout & Functional Requirements

1.  **Top Action Bar:** * Create an "Upload (Xlsx, Csv)" button that parses an uploaded file and sends the raw data to the Node backend to populate an SQLite table.
    * Create an "Export as XLSX" button that pulls the currently viewed/filtered data and downloads it as a spreadsheet.

2.  **Data Manipulation Section (Update/Delete):**
    * Create a form area representing the "Load the raw as cell" section.
    * Include dynamic input fields (Cell 1, Cell 2, Cell 3, etc.) that map to the columns of the database. 
    * When a user clicks a row in the Table Preview below, it should populate these input cells, allowing the user to update the record or delete the row entirely via API calls to the SQLite backend.

3.  **Search Bar:**
    * Implement an input field labeled "Fuzzy Search". This should instantly filter the table data below based on the user's query.

4.  **Table Preview:**
    * Build a large, scrollable data table component occupying the bottom half of the screen. 
    * It should display the current state of the SQLite database. 
    * Ensure the rows are clickable to interface with the Data Manipulation Section above.

Please provide the necessary project structure, the backend Express/SQLite setup code, and the main Vue components to bring this wireframe to life.


add some feature like 
first: if i upload more that one excell in the side bar show me this excell that i uploaded and by clicking this i can
load it and work with it and save new excell in the sqlite file
second: i can add column to the table and it will be saved in the sqlite database
third: i can rename the column and it will be saved in the sqlite database
fourth: i can add shortcut key to take me to this columns that i wanna for example ctrl + 1 to to take me to the first raw in this raw data that i load it
fifth: 

this excell that i actully i load it first raw have excell column name please use this as my excell column names don't generate columns names for it because you fix it right now i see it in excell preview 

also add feature for deleting this sheet that i upload it to delete this sheet i want

add feature that is increase and decrease the font of website not the website it self remember that
also add feature of selecting the language that have arabic and english and kurdish ckb if i type
in the search bar or in the edit raw cell change it to this language that i choose it in the website

add print button of the website and i wanna use this fonts for print documents fonts and also i wanna the documents in nice design 

for kurdish ckb language i wanna use standard Kurdish (Iraq, Arabic-Latin) Ku keybaord for typing the key

please for columns color use color white and please remove "6/20/26, 10:18 PM Voide Form — Dataset Studio" and "Dataset Export" and "localhost:5173"

add some space between left and right and top and add page number in the center bottom
and i wanna only first page have column name for second and third ... i don't wanna see
column name just raw data 

this space you add in the left and right and top is alot make twice less than you add

for page number i wanna like this 1 - end page number

please create upload_github.sh file to upload project easly to github and just ask me to commit name only

also create .bat file to run this project in dev mod


i wanna backup is advance i wanna backup images that i upload it to columns images and also backup this directory that i mension in the columns ....

please add button send data by moving or copy from one excel to another excel in the database when i click to send
i wanna show me copy or move and send to what excel or what table in the database 

add one things for me for export the excell i wanna take me two choice when i click to export the excell i wanna tell
me export entire excell or just this columns i selected

for edit raw if i edit the raw i wanna instaid click to update to update my change i wanna make it auto save

i wanna if port 3000 is busy switch to another port or if port 5173 is busy switch to another port and run this project in that new port update sh file for that

i wanna in edit window for raw box have access to enable fuzzy search for every raw data i can toggle enable the fuzzy search for find data in there columns and put this result raw data in this raw 
for example when i pick the raw and i click to one of the box raw data to enable fuzzy search just for this columns that i selected i wanna enable fuzzy search for finding the data on this raw and put it in because i don't wanna type the same thing again by find it make it easy for me to type the raw data in the edit window and i can toggle diable 
fuzzy search for this raw data

i wanna for enable fuzzy search like switch on and off i don't wanna disable the button if i enable it when i go to another raw and also diable it if i disable it when i go to another raw and also if i close the website and open it again i want the fuzzy search to be disabled by default

i wanna by using ctrl + 1 to pick the first raw result of the table and edit the raw


please instaid using npm use nub 
update the .sh file and .bat file for using this feature
this is some information about this command:

A Bun-like DX on top of stock node, written in Rust.

nub index.ts             # TypeScript-first Node.js runtime
nub run dev              # 24× faster pnpm run
nubx prisma generate     # 19× faster npx
nub install              # 2.5× faster pnpm install
nub watch src/server.ts  # native watch mode
nub pm shim              # built-in Corepack-style shims
nub node install 26      # Node version manager
nub upgrade              # self update
One tool to run your files and scripts, install dependencies, and manage Node itself. No new runtime, no vendor-specific API surface, no lock-in.

Nub	Instead of
nub <file>	node, tsx, ts-node, dotenv-cli
nub run <script>	npm run, pnpm run
nubx	npx, pnpm dlx / exec
nub install	npm, pnpm
nub watch	nodemon, node --watch, tsx watch
nub node	nvm, fnm, n, volta
nub pm	corepack

Install
# macOS / Linux
curl -fsSL https://nubjs.com/install.sh | bash

# Windows (PowerShell)
irm https://nubjs.com/install.ps1 | iex

# Homebrew (macOS / Linux)
brew install nubjs/tap/nub

# Or via npm (pnpm / yarn global add work too)
npm install -g --ignore-scripts=false @nubjs/nub


also create .sh file and .bat file to run the program in build mod not in dev mod





tis is repository of nub "https://github.com/nubjs/nub" please read about
in install_deps.bat do you add installation nub if not exist in te windows
also add statement if nub is not work then use npm instaid for all the file i mean if nub is work then use nub if not use npm also indicate me in the terminal which one they used please remember don't remove anything you added just add statement in the code
now one time review the code if they work perrfectly
