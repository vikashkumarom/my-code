import { ChatGroq } from '@langchain/groq';
import { MemorySaver, MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import readline from 'readline/promises';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from '@langchain/tavily';

const checkpointer = new MemorySaver();
//const app = workflow.compile({ checkpointer: memory });

//web search call

const tool = new TavilySearch({
  maxResults: 3,
  topic: "general",
  // includeAnswer: false,
  // includeRawContent: false,
  includeImages: true,
  // includeImageDescriptions: false,
  // searchDepth: "basic",
  // timeRange: "day",
  // includeDomains: [],
  // excludeDomains: [],
});

//Initialise the tool node
const tools = [tool];
const toolNode = new ToolNode(tools);

//Initialise the LLM
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
  // other params...
}).bindTools(tools);
// call LLM API call method
 async function callModel(state) {
    const response = await llm.invoke(state.messages);
    return{messages: [response]}
}

function shouldCondition(state) {
    const lastMessages = state.messages[state.messages.length -1]
    //console.log('state', state);
    if(lastMessages.tool_calls.length > 0) {
        return 'tools';
    }

    return '__end__';
}
// Build the Graph

 const workFlow =  new StateGraph(MessagesAnnotation)
 .addNode("agent", callModel)
 .addNode("tools", toolNode)
 .addEdge('__start__', 'agent')
 .addEdge('tools', 'agent')
 .addConditionalEdges('agent', shouldCondition)


 //compile and invoke the graph
 const app = workFlow.compile({checkpointer});

async function main(){
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    while(true) {        
        const userInput = await rl.question('You: ');
        if(userInput === 'bye')
            break;
       const  finalState = await app.invoke({
        messages: [{
            role: 'user',
            content: userInput,
        }],
        },  {configurable: {thread_id: '1'}});
        
        const lastMessages = finalState.messages[finalState.messages.length -1]
        console.log('AI:', lastMessages.content);
    }
    rl.close();

}
main();

// next step
// 1. FrontEnd integration 
//2. add new conversation feature - database
