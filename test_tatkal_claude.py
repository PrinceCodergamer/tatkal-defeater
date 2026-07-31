import os
import asyncio
from dotenv import load_dotenv
from browser_use import Agent, ChatBrowserUse

load_dotenv()

async def test_tatkal_booking():
	"""
	Test the Tatkal booking flow using browser-use with Claude via ChatBrowserUse
	"""

	# Use ChatBrowserUse with Claude - single API key for all providers
	llm = ChatBrowserUse(model='anthropic/claude-sonnet-4-6')

	# Define the booking task
	task = """
	You are testing a train ticket booking platform called Tatkal Defeater.
	Navigate to http://localhost:3000 and perform the following steps:

	1. Fill in the search form:
	   - From: New Delhi
	   - To: Mumbai Central
	   - Date: Select tomorrow's date
	   - Class: All

	2. Enter a phone number: 9876543210

	3. Click "Verify" to verify the phone

	4. Click "Enter Queue" to join the booking queue

	5. Wait for admission (should see a waiting room with queue position)

	6. Once admitted, fill in passenger details:
	   - Name: John Doe
	   - Age: 30
	   - Berth: No Preference
	   - Food: None

	7. Proceed to payment

	Report back with screenshots and any errors encountered.
	"""

	agent = Agent(
		task=task,
		llm=llm,
		max_actions=15,  # Limit actions to prevent infinite loops
	)

	print("🚀 Starting Tatkal booking test with Claude via ChatBrowserUse...")
	print("=" * 60)

	try:
		result = await agent.run()
		print("\n✅ Test completed successfully!")
		print("=" * 60)
		print(result)
	except Exception as e:
		print(f"\n❌ Test failed with error: {e}")
		print("=" * 60)

if __name__ == "__main__":
	# Check if BROWSER_USE_API_KEY is set
	if not os.getenv('BROWSER_USE_API_KEY'):
		print("⚠️  ERROR: BROWSER_USE_API_KEY environment variable not set")
		print("Get your key from https://browser-use.com and set it with:")
		print("export BROWSER_USE_API_KEY=your-key-here")
		exit(1)

	asyncio.run(test_tatkal_booking())
