import React from 'react';
import { TaskStatus } from '../../types/task';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import CustomSwitch from '../ui/CustomSwitch';
import { Search, Filter, SortAsc, X } from 'lucide-react';

interface TaskFilterOptions {
  status?: TaskStatus[];
  search?: string;
}

interface TaskFiltersProps {
  filter: TaskFilterOptions;
  onFilterChange: (filter: TaskFilterOptions) => void;
  sortBy: 'created' | 'status';
  onSortChange: (sortBy: 'created' | 'status') => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filter,
  onFilterChange,
  sortBy,
  onSortChange
}) => {
  const handleStatusToggle = (status: TaskStatus) => {
    const currentStatuses = filter.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    onFilterChange({ ...filter, status: newStatuses });
  };

  const handleTagToggle = (_tag: string) => {
    // Tags removed in simplified schema
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Boolean(filter.search || (filter.status && filter.status.length > 0));

  return (
    <Card className="task-filters">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks by title or description..."
                value={filter.search || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange({ ...filter, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select 
                value={sortBy} 
                onValueChange={onSortChange}
                style={{}}
                className="flex items-center gap-2"
              >
                <option value="created">🕒 Created</option>
                <option value="status">📊 Status</option>
              </Select>
              
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4" />
              Status Filters
            </Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(TaskStatus).map(status => (
                <Button
                  key={status}
                  variant={filter.status?.includes(status) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusToggle(status)}
                  className="text-xs"
                >
                  {status === TaskStatus.PENDING && '⏳ Pending'}
                  {status === TaskStatus.IN_PROGRESS && '🔄 In Progress'}
                  {status === TaskStatus.COMPLETED && '✅ Completed'}
                  {status === TaskStatus.NEEDS_REVIEW && '👀 Needs Review'}
                  {status === TaskStatus.ARCHIVED && '📦 Archived'}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Filters removed */}

          {/* Removed tag and due filters for simplified schema */}
        </div>
      </CardContent>
    </Card>
  );
};
