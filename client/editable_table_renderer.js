// Author: jmcgill@plexer.net

function EditableTableRenderer(
    element,
    schema,
    data,
    url,
    sort_by,
    editable,
    onSave) {
  this.element_ = element;
  this.schema_ = schema;
  this.source_data_ = data;
  this.url_ = url;
  this.onSave_ = onSave;
  this.prefix_ = Math.round(Math.random() * 1000);
  this.sort_by_ = sort_by;
  this.editable_ = editable;

  // Copy the source data and sort. We only sort when first rendering,
  // otherwise data jumps around too much.
  this.data_ = this.source_data_.slice(0);
  var me = this;
  this.data_.sort(function (a, b) {
    return a[me.sort_by_] - b[me.sort_by_];
  });
}

EditableTableRenderer.prototype.RenderTable = function() {
  // Render headers.
  var html = "<tr style='text-align: center; font-weight: bold'>";
  html += "<td></td>"
  for (var i = 0; i < this.schema_.length; ++i) {
    html += "<td>" + this.schema_[i][0] + "</td>";
  }
  html += "</tr>";
  this.element_.html(html);

  // Render row data.
  for (var i = 0; i < this.data_.length; ++i) {
    this.renderRow(this.data_[i], this.element_);
  }

  // Render blank trailing row.
  var tr = $("<tr>");
  var td = $("<td>");
  tr.append(td);
  for (var i = 0; i < this.schema_.length; ++i) {
    this.renderColumn(tr, this.schema_[i][1], null, '');
  }
  this.element_.append(tr);
}

EditableTableRenderer.prototype.renderRow = function(data, table) {
  var tr = $("<tr>");
  var ms_per_day = 86400000;

  var td = $("<td>");
  var img = $("<img src='/client/images/delete.png'>");
  img.css('cursor', 'pointer');
  img.click(bind(this, this.DeleteItem, data.id));
  td.append(img);
  tr.append(td);

  for (var i = 0; i < this.schema_.length; ++i) {
    var index = this.schema_[i][1];

    // Is there data available?
    if (!data[index]) {
      this.renderColumn(tr, index, data.id, '');
      continue;
    }

    if (this.schema_[i][2] == "string") {
      this.renderColumn(tr, index, data.id, data[index]);
    } else if (this.schema_[i][2] == "day") {
      var day = new Date(ms_per_day * data[index]);
      this.renderColumn(tr, index, data.id, pad2(day.getDate()) + '-' + pad2(day.getMonth() + 1) + '-' + (1900 + day.getYear()));
    } else if (this.schema_[i][2] == "array") {
      this.renderColumn(tr, index, data.id, data[index].join(','));
    } else if (this.schema_[i][2] == "split") {
      var array = data[index];

      // var today = Math.floor((new Date().getTime()) / 86400000);
      // var remaining_days = array[array.length - 1];
      
      // HACK
      // var updated_at = data.remaining_updates[data.remaining_updates.length - 1];
      // var updated_day = Math.floor(updated_at / 86400);
      // var days_since_update = (today - updated_day);
    
      this.renderColumn(tr, index, data.id, array[array.length - 1]);
    } else if (this.schema_[i][2] == "immutable") {
      var td = $("<td>");
      var day = new Date(ms_per_day * data[index]);
      td.html(pad2(day.getDate()) + '-' + pad2(day.getMonth() + 1) + '-' + (1900 + day.getYear()));
      tr.append(td);
    }
  }

  table.append(tr);
}

EditableTableRenderer.prototype.renderColumn = function(row, name, id, data) {
  var td = $("<td>");
  if (this.editable_) {
    var element = $("<input type='text' class='inline-input'>");
    element.attr('id', this.prefix_ + name + '-' + id);
    element.val(data);
    element.focus(bind(this, this.onFocus, id));
    element.blur(bind(this, this.onBlur, id));
    td.append(element);
  } else {
    td.html(data);
  }
  row.append(td);
}

EditableTableRenderer.prototype.onFocus = function(e) {
  this.focused_value_ = $(e.currentTarget).val();
  this.focused_id_ = $(e.currentTarget).attr('id').split('-')[0];
  console.log(this.focused_id_);
}

EditableTableRenderer.prototype.onBlur = function(e, id) {
  // Only update if the element was changed.
  if ($(e.currentTarget).val() == this.focused_value_) {
    return;
  }

  data = {};
  for (var i = 0; i < this.schema_.length; ++i) {
    var index = this.schema_[i][1];
    data[index] = $("#" + this.prefix_ + index + "-" + id).val();
  }

  $.ajax({
    url: this.url_ + "/update",
    type: "POST",
    data: data,
    success: bind(this, this.onSaved)
  });
}

EditableTableRenderer.prototype.onSaved = function(response) {
  var response = eval('(' + response + ')');

  found = false;
  for (var i = 0; i < this.data_.length; ++i) {
    if (this.data_[i].id == response.id) {
      this.source_data_[i] = response;
      this.data_[i] = response;
      found = true;
    }
  }

  if (!found) {
    this.source_data_.push(response);
    this.data_.push(response);
    this.RenderTable();
    
    console.log('Refocusing on element: ',  this.focused_id_ + "-" + response.id);
    $("#" + this.focused_id_ + "-" + response.id).focus();
  }

  this.onSave_();
}

EditableTableRenderer.prototype.DeleteItem = function(e, id) {
  data = {
    id: id
  };

  $.ajax({
    url: this.url_ + "/delete",
    type: "POST",
    data: data,
    success: bind(this, this.onDeleted, id)
  });
}

EditableTableRenderer.prototype.onDeleted = function(response, code, xhr, id) {
  for (var i = 0; i < this.data_.length; ++i) {
    if (this.data_[i].id == id) {
      this.data_.splice(i, 1);
      this.RenderTable();
      this.onSave_();
      return;
    }
  }
}

// Pad a number to 2 digits.
function pad2(num) {
  if (num < 10) {
    return '0' + num;
  }
  return '' + num;
}
