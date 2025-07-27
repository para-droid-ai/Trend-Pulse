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
    return PerplexityAPI()

def test_api_initialization():
    """Test API initialization with and without API key"""
    # Test with valid API key
    api = PerplexityAPI()
    assert api.api_key is not None
    assert api.BASE_URL == "https://api.perplexity.ai"
    
    # Test without API key
    original_key = os.environ.get("PERPLEXITY_API_KEY")
    if "PERPLEXITY_API_KEY" in os.environ:
        del os.environ["PERPLEXITY_API_KEY"]
    
    with pytest.raises(ValueError):
        PerplexityAPI()
    
    # Restore API key
    if original_key:
        os.environ["PERPLEXITY_API_KEY"] = original_key

@pytest.mark.asyncio
async def test_search_basic(api):
    """Test basic search functionality with mocked response"""
    with patch('perplexity_api.PerplexityAPI._make_request') as mock_make_request:
        mock_make_request.return_value = {
            "choices": [{
                "message": {
                    "content": "Mocked content about quantum computing"
                }
            }]
        }

        query = "Latest developments in quantum computing"
        result = await api.search(
            query=query,
            model="sonar-pro",
            recency_filter="week",
            max_tokens=500
        )

        assert isinstance(result, dict)
        assert "query" in result
        assert "timestamp" in result
        assert "summary" in result
        assert "sources" in result
        assert "model" in result
        assert "recency_filter" in result

        assert result["query"] == query
        assert result["model"] == "sonar-pro"
        assert result["recency_filter"] == "week"
        assert isinstance(result["sources"], list)

@pytest.mark.asyncio
async def test_search_with_previous_summary(api):
    """Test search with previous summary context using mocked response"""
    with patch('perplexity_api.PerplexityAPI._make_request') as mock_make_request:
        mock_make_request.return_value = {
            "choices": [{
                "message": {
                    "content": "Mocked content with previous summary context"
                }
            }]
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
    # Test with invalid model
    with pytest.raises(APIError):
        await api.search(
            query="test query",
            model="invalid-model"
        )

    # Test with invalid recency filter
    with pytest.raises(APIError):
        await api.search(
            query="test query",
            recency_filter="invalid-filter"
        )

@pytest.mark.asyncio
async def test_rate_limiting(api):
    """Test rate limiting functionality with mocked responses"""
    with patch('perplexity_api.PerplexityAPI._make_request') as mock_make_request:
        mock_make_request.return_value = {
            "choices": [{
                "message": {
                    "content": "Mocked content for rate limiting test"
                }
            }]
        }

        # Make multiple requests in quick succession
        for _ in range(3):
            result = await api.search(
                query="test query",
                model="sonar",
                recency_filter="day",
                max_tokens=100
            )
            assert isinstance(result, dict)

if __name__ == "__main__":
    pytest.main([__file__]) 