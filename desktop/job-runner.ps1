param([Parameter(Mandatory = $true)][string]$SpecPath)
$ErrorActionPreference = 'Stop'
$PSModuleAutoLoadingPreference = 'None'
$source = @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class JavaEduJob {
  [StructLayout(LayoutKind.Sequential)] struct BasicLimit {
    public long ProcessTime, JobTime; public uint Flags; public UIntPtr MinWorking, MaxWorking;
    public uint ActiveProcesses; public UIntPtr Affinity; public uint Priority, Scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong A,B,C,D,E,F; }
  [StructLayout(LayoutKind.Sequential)] struct ExtendedLimit {
    public BasicLimit Basic; public IoCounters Io; public UIntPtr ProcessMemory, JobMemory, PeakProcess, PeakJob;
  }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct StartupInfo {
    public uint cb; public string reserved, desktop, title; public uint x,y,xsize,ysize,xchars,ychars,fill,flags;
    public ushort show, reservedSize; public IntPtr reservedBytes, input, output, error;
  }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process, thread; public uint pid, tid; }
  [StructLayout(LayoutKind.Sequential)] struct StartupInfoEx { public StartupInfo basic; public IntPtr attributes; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attr, string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int cls, ref ExtendedLimit limits, uint size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job, uint code);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref StartupInfoEx si, out ProcessInfo pi);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr old, IntPtr result);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForMultipleObjects(uint count, IntPtr[] handles, bool all, uint milliseconds);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int which);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static void Check(bool success) { if (!success) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  static string Quote(string value) {
    var b = new StringBuilder("\""); int slash = 0;
    foreach(char c in value) {
      if (c == '\\') { slash++; continue; }
      if (c == '"') { b.Append('\\', slash * 2 + 1); b.Append(c); slash = 0; continue; }
      b.Append('\\', slash); slash = 0; b.Append(c);
    }
    b.Append('\\', slash * 2); b.Append('"'); return b.ToString();
  }
  public static string[] Run(string executable, string[] args, string cwd, int timeout, int memory, int processLimit, uint parentPid) {
    IntPtr job = IntPtr.Zero, parent = IntPtr.Zero, attributes = IntPtr.Zero, handles = IntPtr.Zero, jobList = IntPtr.Zero;
    var pi = new ProcessInfo(); bool resumed = false, attributesInitialized = false;
    try {
      // A non-inheritable, opened process handle prevents PID-reuse races while monitoring app death.
      parent = OpenProcess(0x00100000, false, parentPid); Check(parent != IntPtr.Zero);
      job = CreateJobObject(IntPtr.Zero, null); Check(job != IntPtr.Zero);
      var limits = new ExtendedLimit();
      limits.Basic.Flags = 0x00002000 | 0x00000008 | 0x00000200; // KILL_ON_JOB_CLOSE | ACTIVE_PROCESS | JOB_MEMORY
      limits.Basic.ActiveProcesses = (uint)processLimit; limits.JobMemory = new UIntPtr((ulong)memory * 1024 * 1024);
      Check(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(limits)));
      var cmd = new StringBuilder(Quote(executable)); foreach(var arg in args) cmd.Append(" ").Append(Quote(arg));
      var si = new StartupInfoEx(); si.basic.cb = (uint)Marshal.SizeOf(si); si.basic.flags = 0x00000100;
      si.basic.input = GetStdHandle(-10); si.basic.output = GetStdHandle(-11); si.basic.error = GetStdHandle(-12);
      // Explicit inheritance allowlist: no helper/app/Job handles can enter learner processes.
      var inherited = new List<IntPtr>();
      foreach (var handle in new[] { si.basic.input, si.basic.output, si.basic.error }) if (handle != IntPtr.Zero && handle != new IntPtr(-1) && !inherited.Contains(handle)) inherited.Add(handle);
      IntPtr attributeSize = IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref attributeSize);
      attributes = Marshal.AllocHGlobal(attributeSize); Check(InitializeProcThreadAttributeList(attributes, 2, 0, ref attributeSize)); attributesInitialized = true;
      handles = Marshal.AllocHGlobal(IntPtr.Size * inherited.Count);
      for (int i = 0; i < inherited.Count; i++) Marshal.WriteIntPtr(handles, i * IntPtr.Size, inherited[i]);
      Check(UpdateProcThreadAttribute(attributes, 0, new IntPtr(0x00020002), handles, new IntPtr(IntPtr.Size * inherited.Count), IntPtr.Zero, IntPtr.Zero));
      // Windows 10+: membership is atomic with process creation, including cancellation before ResumeThread.
      jobList = Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(jobList, job);
      Check(UpdateProcThreadAttribute(attributes, 0, new IntPtr(0x0002000D), jobList, new IntPtr(IntPtr.Size), IntPtr.Zero, IntPtr.Zero));
      si.attributes = attributes;
      Check(CreateProcess(executable, cmd, IntPtr.Zero, IntPtr.Zero, true, 0x00000004 | 0x08000000 | 0x00080000, IntPtr.Zero, cwd, ref si, out pi));
      if (ResumeThread(pi.thread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error());
      resumed = true;
      var reason = "exited";
      uint wait = WaitForMultipleObjects(2, new[] { pi.process, parent }, false, (uint)timeout);
      if (wait == 1) { reason = "parent_exited"; TerminateJobObject(job, 125); }
      else if (wait == 0x00000102) { reason = "timeout"; TerminateJobObject(job, 124); }
      else if (wait != 0) throw new Win32Exception(Marshal.GetLastWin32Error());
      uint code; Check(GetExitCodeProcess(pi.process, out code));
      return new[] { code.ToString(), reason };
    } finally {
      if (!resumed && pi.process != IntPtr.Zero) TerminateProcess(pi.process, 126);
      if (job != IntPtr.Zero) { TerminateJobObject(job, 125); CloseHandle(job); }
      if (pi.thread != IntPtr.Zero) CloseHandle(pi.thread);
      if (pi.process != IntPtr.Zero) CloseHandle(pi.process);
      if (parent != IntPtr.Zero) CloseHandle(parent);
      if (attributesInitialized) DeleteProcThreadAttributeList(attributes);
      if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      if (handles != IntPtr.Zero) Marshal.FreeHGlobal(handles);
      if (jobList != IntPtr.Zero) Marshal.FreeHGlobal(jobList);
    }
  }
}
'@
try {
  # Avoid scanning user/third-party modules on clean Windows hosts. Only the OS utility module is needed.
  Import-Module -Name ([System.IO.Path]::Combine($PSHOME, 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1')) -ErrorAction Stop
  $spec = [System.IO.File]::ReadAllText($SpecPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
  Add-Type -TypeDefinition $source -Language CSharp
  $result = [JavaEduJob]::Run([string]$spec.executable, [string[]]$spec.args, [string]$spec.cwd, [int]$spec.timeoutMs, [int]$spec.memoryMiB, [int]$spec.maxProcesses, [uint32]$spec.parentPid)
  $report = @{ exitCode = [long]$result[0]; reason = $result[1] } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText([string]$spec.resultPath, $report, (New-Object System.Text.UTF8Encoding($false)))
} catch {
  [Console]::Error.WriteLine('Java Edu process supervisor could not start or supervise the command: ' + $_.Exception.Message)
  exit 126
}
