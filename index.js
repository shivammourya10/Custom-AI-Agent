import readlineSync from 'readline-sync';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config'; // Load environment variables from .env file
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

//console.log("Google GenAI API Key:", process.env.GOOGLE_GENAI_API_KEY); // Log the API key for debugging
const History = [];
function sum({ a, b }) {
    return a + b;
}
async function checkWeather({ city }) {
    const response = await fetch(`https://wttr.in/${city}?format=3`);
    const data = await response.text()
    return data;
}

async function cryptoCoin({ coin }) {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`);
    const data = await response.json();

    return data[0];
}

function checkPrime({ num }) {
    if (num <= 1) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}
// Define the grounding tool
const groundingTool = {
    googleSearch: {},
};
// i will ask some price of crypto and teamprature of city you give me answer one by one until i say stop
const availableTools = {
    sum: sum,
    checkWeather: checkWeather,
    cryptoCoin: cryptoCoin,
    checkPrime: checkPrime,
};

// async function main()
// {
//     // const name = readlineSync.question('city name: ');
//     // const data = await checkWeather(name);
//     // console.log(data);

//      const name = readlineSync.question('coin name: ');
//     const data = await cryptoCoin(name);
//     console.log(`Current price of ${data.name}: $${data.current_price}`);
// }

//code syntax is from google AI for developers function calling https://ai.google.dev/gemini-api/docs/function-calling?example=meeting
const sumDeclaration = {
    name: "sum",
    description: "Returns the sum of two numbers",
    parameters: {
        type: "object",
        properties: {
            a: {
                type: "number",
                description: "First number"
            },
            b: {
                type: "number",
                description: "Second number"
            }
        },
        required: ["a", "b"]
    }
};
const weatherDeclaration = {
    name: "checkWeather",
    description: "Returns the current weather for a given city",
    parameters: {
        type: "object",
        properties: {
            city: {
                type: "string",
                description: "City name"
            }
        },
        required: ["city"]
    }
};
const cryptoCoinDeclaration = {
    name: "cryptoCoin",
    description: "Returns the current price of a cryptocurrency",
    parameters: {
        type: "object",
        properties: {
            coin: {
                type: "string",
                description: "Cryptocurrency name"
            }
        },
        required: ["coin"]
    }
};
const primeDeclaration = {
    name: "checkPrime",
    description: "Checks if a number is prime",
    parameters: {
        type: "object",
        properties: {
            num: {
                type: "number",
                description: "Number to check"
            }
        },
        required: ["num"]
    }
};



async function runAgent(userProblem) {
    History.push({
        role: 'user',
        parts: [{ text: userProblem }]
    });
    while (true) {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: History,
            //Systemconfig
            config: {
                systemInstruction: `You are a helpful AI assistant. You can perform calculations, check the weather, get cryptocurrency prices, and check if a number is prime. Use the provided tools to answer user queries.`,
                tools: [{
                    functionDeclarations: [
                        sumDeclaration,
                        weatherDeclaration,
                        cryptoCoinDeclaration,
                        primeDeclaration
                    ]

                }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const { name, args } = response.functionCalls[0];

            const funCall = availableTools[name];
            const result = await funCall(args);

            //model history
            History.push({
                role: 'model',
                parts: [{
                    functionCall: response.functionCalls[0],
                },]
            });
            // If the function call returns a result, you can add it to the history
            const functionResponsePart = {
                functionResponse: {
                    name: name,
                    response: {
                        result: result
                    }
                }
            };
            History.push({
                role: 'user',
                parts: [functionResponsePart]
            });
        }
        else {
            History.push({
                role: 'model',
                parts: [{ text: response.text }]
            });//response.text is the response from the AI model
            console.log(response.text);
            break; // Exit the loop if no function calls are made
        }

    }
}

async function main() {
    while (true) {
        const userProblem = readlineSync.question('Enter your problem: ');
        
        // Check if user wants to stop
        if (userProblem.toLowerCase().includes('stop')) {
            console.log("Goodbye! Thanks for using the AI agent.");
            break;
        }
        
        await runAgent(userProblem);
    }
}
main()