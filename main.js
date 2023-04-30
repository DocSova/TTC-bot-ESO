const { app, BrowserWindow, ipcMain } = require('electron')
const sound = require("sound-play");
const path = require('path');

const soundPath = path.resolve(__dirname, 'hint2.mp3');
let itemMinimumCost = 0;
let lastGuild = "";
let lastPrice = 0;
let history = [];

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Tamriel Trade Centre",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    }
  })
  const secondWindow = new BrowserWindow({
    width: 400,
    height: 500,
    title: "Bot settings",
    parent: mainWindow,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadURL('https://eu.tamrieltradecentre.com/pc/Trade/SearchResult?ItemID=11807&SortBy=LastSeen&Order=desc')
  secondWindow.loadFile('index.html');
  
  ipcMain.on('save-settings', (event, data) => {
    let { itemID, itemCost } = data;
    if (itemID !== "") {
        console.log(itemID)
        const url = `https://eu.tamrieltradecentre.com/pc/Trade/SearchResult?ItemID=${itemID}&SortBy=LastSeen&Order=desc`;
        mainWindow.loadURL(url);
    }
    if (itemCost !== "") {
        itemMinimumCost = Number.parseInt(itemCost);
        lastGuild = "";
        lastPrice = 0;
    }
  });

  function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
  function refreshHistory(lastResult) {
    secondWindow.webContents.executeJavaScript(`
      var ulList = document.getElementById("ulList");

      // Удаляем все дочерние элементы
      while (ulList.firstChild) {
        ulList.removeChild(ulList.firstChild);
      }
    `)

    history.unshift(lastResult);

    if (history.length > 10) {
      history.pop();
    }
    // Создаем и добавляем li элементы в ul
    for (let i = 0; i < history.length; i++) {
      secondWindow.webContents.executeJavaScript(`
        var li = document.createElement("li");
        li.appendChild(document.createTextNode("${history[i]}"));
        ulList.appendChild(li);
      `)
    }
  }
  function currentTime() {
    // Создаем новый объект Date
    let currentTime = new Date();

    // Получаем текущее время
    let hours = currentTime.getHours();
    let minutes = currentTime.getMinutes();

    // Добавляем ноль, если минуты или секунды меньше 10
    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    // Форматируем вывод времени
    return (hours + ":" + minutes);
  }

  mainWindow.webContents.on('dom-ready', () => {
    //Дерьмовый велосипед парса страницы, найти обходное решение проблемы
    sleep(60000 + Math.floor(Math.random() * 10000)).then(() => {
        mainWindow.webContents.executeJavaScript(`
            let tr = document.querySelector('tr.cursor-pointer');
            let children = tr.children;
            let townAndTrader = new String(children[2].innerText);
            let gold = new String(children[3].innerText);
            [townAndTrader.toString(), gold.toString()]
        `).then((result) => {
            console.log(result)
            const guildTownName = result[0].split("\n");
            const guildName = guildTownName[1];
            const townName = guildTownName[0];
            const text = result[1];
            const pattern = /.*\n=\n(.*)/; // регулярное выражение для поиска текста после " \n=\n"
            const resultPrice = text.match(pattern)[1].trim().replace(/\D/g, ''); // находим совпадения с регулярным выражением, выбираем первый элемент, удаляем пробелы в начале и в конце, удаляем все нецифровые символы
            const price = parseInt(resultPrice);

            console.log(`Last price: ${price} Last Guild: ${guildName} Last Town: ${townName}`)
            if (lastGuild != guildName && lastPrice !== price) {
                lastGuild = guildName;
                lastPrice = price;
                console.log("Found new sale");
                if (price < itemMinimumCost) {
                    sound.play(soundPath, 5);
                    refreshHistory(`${price}g - ${townName}: ${guildName} (${currentTime()})`);
                }
            }
            mainWindow.reload();
        })
    .catch((error) => {
      console.error(error);
      mainWindow.reload();
    });
    })
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})