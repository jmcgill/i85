// Author: jmcgill@plexer.net

// TODO(jmcgill): Split into Table Renderer, pull Update out with bind.
// Make Table Renderer call back on update.

var derived_tasks_ = [];
var manager;
var painter;
var table_renderer;

function main(editable) {
  manager = new TaskManager(tasks_, vacations_);
  manager.ExpandTasks();

  var schema = [
    ['Id', 'id', 'string'],
    ['Owner', 'owner', 'string'],
    ['Task', 'description', 'string'],
    ['Start Date', 'start_day', 'day'],
    ['Estimated Duration', 'length', 'string'],
    ['Days Remaining', 'remaining', 'split'],
    ['Depends On', 'dependent_tasks', 'array'],
    ['Ends On', 'end_day', 'day']
  ];
  table_renderer = new EditableTableRenderer(
    $("#tasks-table"),
    schema,
    tasks_,
    "/tasks",
    'end_day',
    editable,
    updateDisplay);
  table_renderer.RenderTable();

  var vacation_schema = [
    ['Id', 'id', 'string'],
    ['Owner', 'owner', 'string'],
    ['Start Date', 'start_day', 'day'],
    ['End Date', 'end_day', 'day']
  ];
  var vacation_table = new EditableTableRenderer(
    $("#vacations-table"),
    vacation_schema,
    vacations_,
    "/vacations",
    'id',
    editable,
    updateDisplay);
  vacation_table.RenderTable();


  tasks_.sort(function(a, b) {
    return a.end_day - b.end_day;
  });
  console.log(tasks_);

  painter = new TaskLinePainter(tasks_, vacations_, $("#timeline"), 20, 180);
  painter.Paint();
}

function updateDisplay() {
  manager.ExpandTasks();

  tasks_.sort(function(a, b) {
    return a.end_day - b.end_day;
  });

  table_renderer.RenderTable();

  painter = new TaskLinePainter(tasks_, vacations_, $("#timeline"), 20, 180);
  painter.Paint();
}
