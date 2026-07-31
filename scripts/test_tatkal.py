import os
from langchain_openai import ChatOpenAI
from browser_use import Agent
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def main():
    agent = Agent(
        task="Navigate to http://localhost:3000, fill out the Tatkal booking form for NDLS-BCT, and enter the queue.",
        llm=ChatOpenAI(model="gpt-4o"), # Browser-use usually requires an LLM with Vision
    )
    result = await agent.run()
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
