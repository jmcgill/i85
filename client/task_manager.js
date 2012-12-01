function TaskManager(tasks, vacations) {
  this.tasks_ = tasks;
  this.vacations_ = vacations;
}

// All dates are relative to Jan 1, 1970

TaskManager.prototype.ExpandTasks = function() {
  // Reset all tasks.
  for (var i = 0; i < this.tasks_.length; ++i) {
    this.tasks_[i].end_day = null;
    this.tasks_[i].derived_start_day = null;
  }

  for (var i = 0; i < this.tasks_.length; ++i) {
  	var task = this.tasks_[i];

  	// Ignore empty sets of dependent tasks.
  	if (task.dependent_tasks[0] == "") {
  	  task.dependent_tasks = [];
  	}
  }

  for (var i = 0; i < this.tasks_.length; ++i) {
    var task = this.tasks_[i];
    this.ExpandTask(task);
  }
}

// Returns the end date for a particular task, expanding it if
// required.
TaskManager.prototype.ExpandTask = function(task) {
  	// Has this task already been expanded?
  	if (task.derived_start_day && task.end_day) {
      return task.end_day;
  	}

  	// When can we start this task?
  	var start = Math.max(0, task.start_day);
    task.dependent_endings = [];
  	for (var i = 0; i < task.dependent_tasks.length; ++i) {
      var dep_id = this.GetDepId(task.dependent_tasks[i]);

      var dep_task = this.GetTaskById(dep_id);
      if (!dep_task) {
        alert('Could not find task with ID: ', dep_id);
      }
      var dep_end_day = this.ExpandTask(dep_task);

      // Apply a filter if required.
      dep_end_day = this.ApplyFilter(task.dependent_tasks[i], dep_end_day);
      task.derived_dep_end = dep_end_day;
      task.derived_dep_owner = dep_task.owner;
      
      // Track ALL dependencies for a cleaner visualization.
      task.dependent_endings.push({
        day: dep_end_day,
        owner: dep_task.owner
      });

      var old_start = start;
      var start = Math.max(start, dep_end_day);
      if (isNaN(start)) {
        console.log('******************* ', task, i, dep_id, dep_task, dep_end_day, old_start);
      }
  	}
    task.derived_start_day = start;

    // When will we end this task?
    var today = Math.floor(new Date().getTime() / 86400000);
    var remaining_days = parseInt(task.remaining[task.remaining.length - 1]);
    var updated_at = task.remaining_updates[task.remaining_updates.length - 1];
    var updated_day = Math.floor(updated_at / 86400);
    var days_since_update = (today - updated_day);
    
    // This *should* be the actual number of days remaining on the task.
    //var remaining_days = remaining_days - days_since_update;
    // task.computed_remaining_days = remaining_days;
    // console.log(today, updated_at, updated_day, days_since_update, remaining_days);

    // If actually 'on' the task, use remaining days since the last remaining
    // days update.
    if (updated_day >= start) {
      // Number of days left since the update.
      if (updated_day > start) {
        remaining_days = remaining_days;// - days_since_update;
        // task.end_day = updated_at;
      }
      
      task.end_day = updated_day;

      console.log('Task ', task.description, 'has started. It has ', remaining_days, ' from today.');

    } else {
      task.end_day = task.derived_start_day;
    }
    // task.end_day = task.derived_start_day;

    // if (task.id == "1") {
    //   console.log('*****************************************************************');
    //   console.log('*****************************************************************');
    //   console.log('*****************************************************************');
    //   console.log(task, DayOffsetToShortDate(start), remaining_days, DayOffsetToShortDate(updated_day), 
    //     DayOffsetToShortDate(task.derived_start_day), DayOffsetToShortDate(task.end_day));
    // }

    // Options:
    // 1. The task is in the future, use start days.
    // 2. The task has been started and then the days remaining was updated.
    //    use days past days remaining.

    task.computed_remaining_days = 0;
    while (remaining_days > 0) {
      task.end_day += 1;
      var day_of_week = this.DayOffsetToDayOfWeek(task.end_day);

      // Is this a weekend?
      if (day_of_week == 0 || day_of_week == 6) {
        continue;
      }

      // Is this user on vacation?
      if (this.IntersectsVacation(task.owner, task.end_day)) {
        continue;
      }

      // Is it after now?
      if (task.end_day >= today) {
        task.computed_remaining_days += 1;
      }

      remaining_days -= 1;
    }

    //if (remaining_days < 0) {
    //  task.end_day = today + remaining_days;
    //  console.log('End day is: ', task.end_day);
    //}
    return task.end_day;
}

TaskManager.prototype.DayOffsetToDayOfWeek = function(day_offset) {
  var ms_per_day = 86400000;
  var day = new Date(ms_per_day * day_offset);
  return day.getDay();
}

TaskManager.prototype.GetTaskById = function(id) {
  for (var i = 0; i < this.tasks_.length; ++i) {
    if (this.tasks_[i].id == id) return this.tasks_[i];
  }
  return null;
}

TaskManager.prototype.IntersectsVacation = function(owner, day) {
  for (var i = 0; i < this.vacations_.length; ++i) {
    vacation = this.vacations_[i];

    // Does this vacation belong to this owner?
    if (vacation.owner != owner) {
      continue;
    }

    // Is this day inside this vacation?
    if (day >= vacation.start_day && day <= vacation.end_day) {
      return true;
    }
  }
  return false;
}

// End dates as a function of a CW release.
// From the provided day, find the next Friday (cutoff), and then
// Monday two weeks after that.
TaskManager.prototype.cw_release = function(day) {
  var day_of_week = this.DayOffsetToDayOfWeek(day);

  // Day of the cut.
  var next_friday = (12 - day_of_week) % 7;

  // Find the next available cut.
  while (this.IntersectsVacation("cw_release", day + next_friday)) {
    next_friday += 7;
  }

  var next_monday = next_friday + 3;
  var monday_fortnight = (day + next_monday + 7);

  return monday_fortnight;
}

TaskManager.prototype.GetDepId = function(dep_id_string) {
  return dep_id_string.split("|")[0];
}

TaskManager.prototype.ApplyFilter = function(dep_id_string, day) {
  var filter = dep_id_string.split("|")[1];

  if (filter == "cw_release") {
    // TODO(jmcgill): Factor out.
    var task = null;
    for (var i = 0; i < derived_tasks_.length; ++i) {
      if (derived_tasks_[i].id == dep_id_string) {
        task = derived_tasks_[i];
      }
    }

    // Have we already constructed a derived task with this ID?
    if (!task) {
      task = {
        id: dep_id_string,
        description: "Cartewheel Release"
      }
      derived_tasks_.push(task);
    }
    task.derived_dep_end = day;
    task.end_day = this.cw_release(day);

    return this.cw_release(day);
  } else {
    return day;
  }
}


// TEMP
function DayOffsetToShortDate(day_offset) {
  var ms_per_day = 86400000;
  var day = new Date(ms_per_day * day_offset);
  return day.getDate() + '-' + (day.getMonth() + 1);
}
