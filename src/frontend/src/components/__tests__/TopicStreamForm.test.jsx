import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicStreamForm from '../TopicStreamForm';

describe('TopicStreamForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  const renderForm = () => {
    return render(<TopicStreamForm onSubmit={mockOnSubmit} />);
  };
  
  const fillForm = async (user, query = 'Test query') => {
    await user.type(screen.getByTestId('topic-query-input'), query);
    await user.selectOptions(screen.getByTestId('update-frequency-select'), 'daily');
    await user.selectOptions(screen.getByTestId('detail-level-select'), 'detailed');
    await user.selectOptions(screen.getByTestId('model-type-select'), 'sonar-reasoning');
    await user.selectOptions(screen.getByTestId('recency-filter-select'), '1d');
    await user.selectOptions(screen.getByTestId('context-history-level-select'), 'last_1');
  };
  
  test('renders form with all fields', () => {
    renderForm();
    
    expect(screen.getByTestId('topic-query-input')).toBeInTheDocument();
    expect(screen.getByTestId('update-frequency-select')).toBeInTheDocument();
    expect(screen.getByTestId('detail-level-select')).toBeInTheDocument();
    expect(screen.getByTestId('model-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('recency-filter-select')).toBeInTheDocument();
    expect(screen.getByTestId('create-stream-button')).toBeInTheDocument();
  });
  
  test('shows error for empty query', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(screen.getByText('Query is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  
  test('shows error for short query', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await user.type(screen.getByTestId('topic-query-input'), 'ab');
    await user.click(screen.getByTestId('create-stream-button'));
    
    expect(screen.getByText('Query must be at least 3 characters')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  
  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await fillForm(user);
    await user.click(screen.getByTestId('create-stream-button'));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        query: 'Test query',
        update_frequency: 'daily',
        detail_level: 'detailed',
        model_type: 'sonar-reasoning',
        recency_filter: '1d',
        context_history_level: 'last_1'
      }));
    });
  });
});
