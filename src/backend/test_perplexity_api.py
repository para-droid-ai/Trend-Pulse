import os
import pytest
from dotenv import load_dotenv
from unittest.mock import patch, MagicMock
from perplexity_api import PerplexityAPI, APIError

# Load environment variables
load_dotenv()

@pytest.fixture
def api():
    """Create a PerplexityAPI instance for testing"""
    # Set a dummy API key for testing purposes
    os.environ["PERPLEXITY_API_KEY"] = "test_key"
    api_instance = PerplexityAPI()
    # Clean up the environment variable after the test
    del os.environ["PERPLEXITY_API_KEY"]
    return api_instance

from unittest.mock import patch, MagicMock, AsyncMock

def test_api_initialization(api):
    """Test API initialization with and without API key"""
    assert api.api_key is not None
    assert api.BASE_URL == "https://api.perplexity.ai"
    
    with patch.dict(os.environ, {"PERPLEXITY_API_KEY": ""}):
        with pytest.raises(ValueError):
            PerplexityAPI()

@pytest.mark.asyncio
async def test_search_basic(api):
    """Test basic search functionality with mocked response"""
    with patch('perplexity_api.PerplexityAPI._make_request', new_callable=AsyncMock) as mock_make_request:
        # Mock response data
        mock_make_request.return_value = {
            "choices": [{"message": {"content": "Mocked content about quantum computing"}}],
            "search_results": []
        }

        query = "Latest developments in quantum computing"
        result = await api.search(
            query=query,
            model="sonar-pro",
            recency_filter="week",
            max_tokens=500
        )

        assert isinstance(result, dict)
        assert result["query"] == query
        assert result["model"] == "sonar-pro"

@pytest.mark.asyncio
async def test_search_with_previous_summary(api):
    """Test search with previous summary context using mocked response"""
    with patch('perplexity_api.PerplexityAPI._make_request', new_callable=AsyncMock) as mock_make_request:
        mock_make_request.return_value = {
            "choices": [{"message": {"content": "Mocked content with previous summary context"}}],
            "search_results": []
        }

        query = "Latest developments in quantum computing"
        previous_summary = "Previous summary about quantum computing"

        result = await api.search(
            query=query,
            model="sonar-pro",
            recency_filter="week",
            previous_summary=previous_summary
        )

        assert isinstance(result, dict)
        assert "summary" in result
        assert len(result["summary"]) > 0

@pytest.mark.asyncio
async def test_search_error_handling(api):
    """Test error handling for invalid requests"""
    with patch('perplexity_api.PerplexityAPI._make_request', new_callable=AsyncMock) as mock_make_request:
        mock_make_request.side_effect = APIError("Test API Error")

        with pytest.raises(APIError):
            await api.search(
                query="test query",
                model="invalid-model"
            )

@pytest.mark.asyncio
async def test_rate_limiting(api):
    """Test rate limiting functionality with mocked responses"""
    with patch('perplexity_api.PerplexityAPI._make_request', new_callable=AsyncMock) as mock_make_request:
        mock_make_request.return_value = {
            "choices": [{"message": {"content": "Mocked content for rate limiting test"}}],
            "search_results": []
        }

        for _ in range(3):
            result = await api.search(
                query="test query",
                model="sonar",
                recency_filter="day",
                max_tokens=100
            )
            assert isinstance(result, dict)

@pytest.mark.asyncio
async def test_source_extraction_from_search_results(api):
    """Test that sources are correctly extracted from the 'search_results' field."""
    with patch('perplexity_api.PerplexityAPI._make_request', new_callable=AsyncMock) as mock_make_request:
        mock_make_request.return_value = {
            "choices": [{"message": {"content": "Some summary."}}],
            "search_results": [
                {"url": "https://example.com/source1"},
                {"url": "https://example.com/source2"}
            ]
        }

        result = await api.search_perplexity(query="test")

        assert "sources" in result
        assert len(result["sources"]) == 2
        assert "https://example.com/source1" in result["sources"]
        assert "https://example.com/source2" in result["sources"]

def test_prepare_messages_with_previous_summary(api):
    """Test that _prepare_messages correctly constructs the prompt with a previous summary."""
    query = "new query"
    previous_summary = "old summary"
    messages = api._prepare_messages(query, previous_summary)
    
    assert len(messages) == 2 # System and User
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert "Based on the following previous summary" in messages[1]["content"]
    assert "old summary" in messages[1]["content"]
    assert "new query" in messages[1]["content"]

if __name__ == "__main__":
    pytest.main([__file__])