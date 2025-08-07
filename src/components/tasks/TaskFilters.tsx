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
  tags?: string[];
  overdue?: boolean;
  dueToday?: boolean;
}

interface TaskFiltersProps {
  filter: TaskFilterOptions;
  onFilterChange: (filter: TaskFilterOptions) => void;
  sortBy: 'dueDate' | 'created' | 'status';
  onSortChange: (sortBy: 'dueDate' | 'created' | 'status') => void;
  showCompleted: boolean;
  onShowCompletedChange: (show: boolean) => void;
  availableTags: string[];
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  showCompleted,
  onShowCompletedChange,
  availableTags
}) => {
  const handleStatusToggle = (status: TaskStatus) => {
    const currentStatuses = filter.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    onFilterChange({ ...filter, status: newStatuses });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filter.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    onFilterChange({ ...filter, tags: newTags });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filter).some(key => {
    const value = filter[key as keyof TaskFilterOptions];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

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
                <option value="dueDate">📅 Due Date</option>
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

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <CustomSwitch
                id="show-completed"
                checked={showCompleted}
                onChange={onShowCompletedChange}
              />
              <Label htmlFor="show-completed" className="text-sm">
                Show completed tasks
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <CustomSwitch
                id="filter-overdue"
                checked={filter.overdue || false}
                onChange={(checked: boolean) => onFilterChange({ ...filter, overdue: checked })}
              />
              <Label htmlFor="filter-overdue" className="text-sm">
                🚨 Overdue only
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <CustomSwitch
                id="filter-due-today"
                checked={filter.dueToday || false}
                onChange={(checked: boolean) => onFilterChange({ ...filter, dueToday: checked })}
              />
              <Label htmlFor="filter-due-today" className="text-sm">
                📅 Due today only
              </Label>
            </div>
          </div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Button
                    key={tag}
                    variant={filter.tags?.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTagToggle(tag)}
                    className="text-xs"
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
