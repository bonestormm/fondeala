//General variables for contracts and testnet
const NETWORK_ID = 4
const TOKEN_CONTRACT_ADDRESS = "0xA3D0089A681e710343f523c5c26Cb52a0a341905"
const MARKETPLACE_CONTRACT_ADDRESS = "0xB931952F2c7fb79032cAF80CFaE809C8F9a087EA"
const TOKEN_CONTRACT_JSON_PATH = "./NFTContract.json"
const MARKETPLACE_CONTRACT_JSON_PATH = "./MarketplaceContract.json"
var token_contract
var marketplace_contract
var accounts
var web3
var balance

function metamaskReloadCallback() {
    window.ethereum.on('accountsChanged', (accounts) => {
        document.getElementById("web3_message").textContent = "Accounts changed, refreshing...";
        window.location.reload()
    })
    window.ethereum.on('networkChanged', (accounts) => {
        document.getElementById("web3_message").textContent = "Network changed, refreshing...";
        window.location.reload()
    })
}

//Function associated to session in metamask

const getWeb3 = async() => {
    return new Promise((resolve, reject) => {
        if (document.readyState == "complete") {
            if (window.ethereum) {
                const web3 = new Web3(window.ethereum)
                window.location.reload()
                resolve(web3)
            } else {
                reject("must install MetaMask")
                document.getElementById("web3_message").textContent = "Error: Please connect to Metamask";
            }
        } else {
            window.addEventListener("load", async() => {
                if (window.ethereum) {
                    const web3 = new Web3(window.ethereum)
                    resolve(web3)
                } else {
                    reject("must install MetaMask")
                    document.getElementById("web3_message").textContent = "Error: Please install Metamask";
                }
            });
        }
    });
};

//Function associated to get a contract

const getContract = async(web3, contract_json_path, contract_address) => {
    const response = await fetch(contract_json_path);
    const data = await response.json();

    const netId = await web3.eth.net.getId();
    contract = new web3.eth.Contract(
        data,
        contract_address
    );
    return contract
}

//Function associated to all listing functions.
async function loadDapp() {
    metamaskReloadCallback()
    document.getElementById("web3_message").textContent = "Cargando..."
    var awaitWeb3 = async function() {
        web3 = await getWeb3()
        web3.eth.net.getId((err, netId) => {
            if (netId == NETWORK_ID) {
                var awaitContract = async function() {
                    token_contract = await getContract(web3, TOKEN_CONTRACT_JSON_PATH, TOKEN_CONTRACT_ADDRESS)
                    marketplace_contract = await getContract(web3, MARKETPLACE_CONTRACT_JSON_PATH, MARKETPLACE_CONTRACT_ADDRESS)
                    await window.ethereum.request({ method: "eth_requestAccounts" })
                    accounts = await web3.eth.getAccounts()
                    balance = await token_contract.methods.balanceOf(accounts[0]).call()
                    for (i = 0; i < balance; i++) {
                        nft_id = await token_contract.methods.tokenOfOwnerByIndex(accounts[0], i).call()
                        insertMyTokenHTML(nft_id)
                    }

                    my_listings_count = await marketplace_contract.methods.getListingsByOwnerCount(accounts[0]).call()
                    for (i = 0; i < my_listings_count; i++) {
                        listing_id = await marketplace_contract.methods.getListingsByOwner(accounts[0], i).call()
                        insertMyListingHTML(listing_id)
                    }

                    active_listing_count = await marketplace_contract.methods.getActiveListingsCount().call()
                    for (i = 0; i < active_listing_count; i++) {
                        listing_id = await marketplace_contract.methods.getActiveListings(i).call()
                        insertActiveListingHTML(listing_id)
                    }

                    if (balance == 1)
                        document.getElementById("web3_message").textContent = "You have 1 token"
                    else
                        document.getElementById("web3_message").textContent = "You have " + balance + " tokens"
                };
                awaitContract();
            } else {
                document.getElementById("web3_message").textContent = "Please connect to Rinkeby";
            }
        });
    };
    awaitWeb3();
}

//Function related to my nfts and how to interact with them
function insertMyTokenHTML(nft_id) {
    //Token number text
    var token_element = document.createElement("p")
    token_element.innerHTML = "Token #" + nft_id
    document.getElementById("my_nfts").appendChild(token_element)

    //Approve Button
    let approve_btn = document.createElement("button")
    approve_btn.innerHTML = "<button class='bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg'>Approve</button>"
    document.getElementById("my_nfts").appendChild(approve_btn)
    approve_btn.onclick = function() {
        approve(MARKETPLACE_CONTRACT_ADDRESS, nft_id)
    }

    //Price
    var input = document.createElement("input")
    input.type = "text"
    input.placeholder = "Price"
    input.id = "price" + nft_id
    document.getElementById("my_nfts").appendChild(input)

    //Sell Button
    let mint_btn = document.createElement("button")
    mint_btn.innerHTML = "<button class='bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg'>Sell!</button>"
    document.getElementById("my_nfts").appendChild(mint_btn)
    mint_btn.onclick = function() {
        price = document.getElementById("price" + nft_id).value;
        addListing(nft_id, web3.utils.toWei(price))
    }
}
//Function associated to insert my listing
async function insertMyListingHTML(listing_id) {
    listing = await marketplace_contract.methods.listings(listing_id).call()
        //Token number text
    var token_element = document.createElement("p")
    token_element.innerHTML = "Token #" + listing.token_id + " (price: " + web3.utils.fromWei(listing.price) + ")"
    document.getElementById("my_listings").appendChild(token_element)

    //Delist Button
    let delist_btn = document.createElement("button")
    delist_btn.innerHTML = "<button class='bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg w-24'>Delist</button>"
    document.getElementById("my_listings").appendChild(delist_btn)
    delist_btn.onclick = function() {
        removeListing(listing_id)
    }
}
//Active listing function associated with call all listing items and delist if neccesary
async function insertActiveListingHTML(listing_id) {
    listing = await marketplace_contract.methods.listings(listing_id).call()
        //Token number text
    var token_element = document.createElement("p")
        //token_element.innerHTML = "Token #" + listing.token_id + " (price: " + web3.utils.fromWei(listing.price) + ") " //"<div class='max-w-sm rounded overflow-hidden shadow-lg m-2'> <img class='w-full' src='img/nft-mariel-1.png' alt='Mountain'>    <div class='px-6 py-4'>    <div> " + listing.token_id + "</div>    <div>@mariel.bello </div>        <div class='flex'>Pixart Motion <span> <img src='img/os.png' alt='' width='20' height='20' class='m-1'></span></div>    </div>    <hr class='mx-auto'>    <div class='flex flex-wrap justify-between content-between my-2'>        <div class='px-6 pt-4 pb-2 font-bold'>Price</div>        <div class='px-6 pt-4 pb-2 space-x-8 font-bold'> " + web3.utils.fromWei(listing.price) + " ETH</div>    </div></div>"

    //
    document.getElementById("all_listings").appendChild(token_element)

    //Delist Button
    let delist_btn = document.createElement("button")
    delist_btn.innerHTML = "<div class='max-w-sm rounded overflow-hidden shadow-lg m-2'> <img class='w-full' src='img/nft-mariel-1.png' alt='Mountain'>    <div class='px-6 py-4'>        <div>@mariel.bello <span class='px-5'><button class='bg-purple-700 hover:bg-purple-600 text-white py-2 px-4 rounded-lg w-48'>I WANT TO INVEST</button></span></div>        <div class='flex'>Pixart Motion <span> <img src='img/os.png' alt='' width='20' height='20' class='m-1'></span></div>    </div>    <hr class='mx-auto'>    <div class='flex flex-wrap justify-between content-between my-2'>        <div class='px-6 pt-4 pb-2 font-bold'>Price</div>        <div class='px-6 pt-4 pb-2 space-x-8 font-bold'>" + web3.utils.fromWei(listing.price) + " ETH</div>    </div></div>"
    document.getElementById("all_listings").appendChild(delist_btn)
    delist_btn.onclick = function() {
        buy(listing_id, listing.price)
    }
}

const mint = async() => {
    const result = await token_contract.methods.mint()
        .send({ from: accounts[0], gas: 0 })
        .on('transactionHash', function(hash) {
            document.getElementById("web3_message").textContent = "Minting...";
        })
        .on('receipt', function(receipt) {
            document.getElementById("web3_message").textContent = "Success!";
        })
        .catch((revertReason) => {
            console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
        });
}

const approve = async(contract_address, token_id) => {
    const result = await token_contract.methods.approve(contract_address, token_id)
        .send({ from: accounts[0], gas: 0 })
        .on('transactionHash', function(hash) {
            document.getElementById("web3_message").textContent = "Approving...";
        })
        .on('receipt', function(receipt) {
            document.getElementById("web3_message").textContent = "Success!";
        })
        .catch((revertReason) => {
            console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
        });
}

const addListing = async(token_id, price) => {
    const result = await marketplace_contract.methods.addListing(token_id, price)
        .send({ from: accounts[0], gas: 0 })
        .on('transactionHash', function(hash) {
            document.getElementById("web3_message").textContent = "Adding listing...";
        })
        .on('receipt', function(receipt) {
            document.getElementById("web3_message").textContent = "Success!";
        })
        .catch((revertReason) => {
            console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
        });
}

const removeListing = async(listing_id) => {
    const result = await marketplace_contract.methods.removeListing(listing_id)
        .send({ from: accounts[0], gas: 0 })
        .on('transactionHash', function(hash) {
            document.getElementById("web3_message").textContent = "Removing from listings...";
        })
        .on('receipt', function(receipt) {
            document.getElementById("web3_message").textContent = "Success!";
        })
        .catch((revertReason) => {
            console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
        });
}

const buy = async(listing_id, price) => {
    const result = await marketplace_contract.methods.buy(listing_id)
        .send({ from: accounts[0], gas: 0, value: price })
        .on('transactionHash', function(hash) {
            document.getElementById("web3_message").textContent = "Buying...";
        })
        .on('receipt', function(receipt) {
            document.getElementById("web3_message").textContent = "Success!";
        })
        .catch((revertReason) => {
            console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
        });
}
loadDapp()